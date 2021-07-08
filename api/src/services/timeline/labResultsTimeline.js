import _ from 'lodash';
import moment from  'moment';
import { TimeSeries, TimeRangeEvent } from 'pondjs';
import logger from '@tools/logger';

import {
    dateDiffDays,
    getEventTimeRange,
    isDateBetween,
    getAggregationPeriodFromDate,
    logAggregationForFhirType,
} from '@timeline/date.js';

import {
    formatLabResultEvents,
} from '@timeline/fhirToFront.js';


/** aggregateTimelineLR() Calculating the difference between 2 dates to aggregate the results following business logic rules
* @param { date1 & date2 } are the dates
* @param { labResultsP } is a Patient labResults array
*/
const aggregateTimelineLabResults = (startDateP, endDateP, labResultsP) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;
    let nbSubTimeline = 4;

    const delta = (startDate instanceof Date && endDate instanceof Date) && dateDiffDays(startDate, endDate);

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || labResultsTimeline.js');
    }
    logAggregationForFhirType('Lab Results', delta, startDate, endDate);

    let labResultsByCode = {};
    const domainCodeToName = {};
    if (typeof labResultsP !== 'undefined' && labResultsP.length > 0) {
        labResultsByCode = labResultsP.reduce((acc, document)=>{
            if (isDateBetween(document.date, document.date, startDate, endDate)){
                const dateResults = new Date(document.date);
                const period = getAggregationPeriodFromDate(dateResults, delta);
                const day = dateResults.toLocaleString('en-GB', {year: 'numeric', day: 'numeric', month: 'numeric'});

                if (acc && (document.categoryCode in acc)){
                    if (period in acc[document.categoryCode]) {
                        if (day in acc[document.categoryCode][period]){
                            acc[document.categoryCode][period][day].push(document);
                        } else {
                            acc[document.categoryCode][period][day] = [document];
                        }
                    } else {
                        acc[document.categoryCode][period] = {[day] : [document]  };
                    }
                } else {
                    acc[document.categoryCode] = { [period]:  {[day] : [document]  }};
                    domainCodeToName[document.categoryCode] = document.categoryDisplay;
                }
                if (acc && ('maintimeline' in acc)){
                    if (period in acc.maintimeline) {
                        if (day in acc.maintimeline[period]){
                            acc.maintimeline[period][day].push(document);
                        } else {
                            acc.maintimeline[period][day] = [document];
                        }
                    } else {
                        acc.maintimeline[period] = {[day] : [document]  };
                    }
                }
                else {
                    acc.maintimeline = { [period]:  {[day] : [document]  }};
                }
            }
            return acc;
        }, {});
    }

    if ( Object.keys(labResultsByCode).length > 0) {
        logger.info(`Nombre de Lab Results trouvé(s) : ${Object.keys(labResultsByCode).length}`);

        // Tri des sous-timelines par ordre décroissant de nb de docs
        const docCountsByCode = {};
        for (const [code, lrByCode] of Object.entries(labResultsByCode)) {

            let count = 0;
            for (const [period, lrListByPeriod] of Object.entries(lrByCode)) {
                for (const [day, lrListByDay] of Object.entries(lrListByPeriod)) {
                    count = count + lrListByDay.length;
                }
            }
            docCountsByCode[code] = count;
        }
        const sortedCounts = Object.entries(docCountsByCode).sort(function (a, b) {
            return b[1] - a[1];
        });

        // aggrégation des documents de rang nbSubTimeline ou plus
        const aggregatedSubTimeline = {};
        const finalResultsByCode = {};
        sortedCounts.forEach( (code, idx) => {
            if (idx < nbSubTimeline) {
                if (code[0] === 'maintimeline' ) {nbSubTimeline = ++nbSubTimeline;}
                finalResultsByCode[(code[0] === 'maintimeline') ? 'Biologie' : code[0]] = labResultsByCode[code[0]];
                return;
            }
            const lrByCode = labResultsByCode[code[0]];
            for (const [period, lrListByPeriod] of Object.entries(lrByCode)) {
                if (!(period in aggregatedSubTimeline)) {aggregatedSubTimeline[period] = {};}
                for (const [day, lrListByDay] of Object.entries(lrListByPeriod)) {
                    if (!(day in aggregatedSubTimeline[period])) {aggregatedSubTimeline[period][day] = [];}
                    aggregatedSubTimeline[period][day] = aggregatedSubTimeline[period][day].concat(lrListByDay);
                }
            }
        });
        // tri de l'aggrégat
        for (const [period, lrListByPeriod] of Object.entries(aggregatedSubTimeline)) {
            aggregatedSubTimeline[period] = _(lrListByPeriod).toPairs().sort((a,b) => {
                return moment(a[0], 'DD/MM/YYYY').toDate() - moment(b[0], 'DD/MM/YYYY').toDate();
            }).fromPairs().value();
        }
        Object.entries(aggregatedSubTimeline).sort();
        if (Object.entries(aggregatedSubTimeline).length) {finalResultsByCode.autres = aggregatedSubTimeline;}

        let mainTimeline = null;
        const unsortedSubTimelines = {};
        for (const [code, lrByCode] of Object.entries(finalResultsByCode)) {
            const eventsReports = [];
            for (let [period, lrListByPeriod] of Object.entries(lrByCode)) {
                lrListByPeriod = _(lrListByPeriod).toPairs().sort((a,b) => {
                    return moment(a[0], 'DD/MM/YYYY').toDate() - moment(b[0], 'DD/MM/YYYY').toDate();
                }).fromPairs().value();
                const timeRange = getEventTimeRange(moment(Object.values(lrListByPeriod)[0][0].date),
                    moment(Object.values(lrListByPeriod)[Object.values(lrListByPeriod).length - 1][0].date),
                    delta);
                const event = { labResults : formatLabResultEvents(lrListByPeriod, code === 'Biologie' ? 'Biologie' : domainCodeToName[code])};
                const timeRangeEvent = new TimeRangeEvent(timeRange, event);
                eventsReports.push(timeRangeEvent);
            }

            eventsReports.sort((a,b) => {
                return new Date(a.begin()) - new Date(b.begin());
            });

            if (code === 'Biologie') {
                mainTimeline = new TimeSeries({
                    name: code,
                    events: eventsReports,
                });
            } else {

                unsortedSubTimelines[domainCodeToName[code]] = new TimeSeries({
                    name: domainCodeToName[code],
                    events: eventsReports,
                });
            }
        }


        // mise dans le bon ordre
        const subTimelines = [];
        if ('Biochimie' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.Biochimie);}
        if ('Hématologie' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines['Hématologie']);}
        for (const [key, value] of Object.entries(unsortedSubTimelines)) {
            if (!['Biochimie', 'Hématologie', 'UNKNOWN_TYPE', 'autres'].includes(key)) {subTimelines.push(value);}
        }
        if ('autre' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.autre);}
        if ('UNKNOWN_TYPE' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.UNKNOWN_TYPE);}

        return { mainTimeline : mainTimeline, subTimelines : subTimelines};
    } else {
        logger.info(`Pas de Lab Results trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return { mainTimeline: null, subTimelines : []};
    }
};

module.exports = {
    aggregateTimelineLabResults,
};
