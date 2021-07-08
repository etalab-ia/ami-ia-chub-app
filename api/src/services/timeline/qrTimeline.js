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
    formatQuestionnaireResponseEvents,
} from '@timeline/fhirToFront.js';


/**
 * aggregateTimelineQR() Calculating the difference between 2 dates to aggregate the results following business logic rules
 * @param { date1 & date2 } are the dates
 * @param { patient } is a Patient type of data
 * @param { sbType } is the type of sb
 */
const aggregateTimelineQR = (startDateP, endDateP, qrP, mainTimelineName) => {


    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;

    const delta = dateDiffDays(startDate, endDate);
    let nbSubTimeline = 4;

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || qrTimeline.js');
    }
    logAggregationForFhirType(mainTimelineName, delta, startDate, endDate);

    let aggregatedQRData = {};
    const categoryCodeToName = {};
    if (typeof qrP !== 'undefined' && qrP.length > 0) {
        aggregatedQRData = qrP.reduce((acc, document) => {
            if (isDateBetween(document.date, document.date, startDate, endDate)){
                const period = getAggregationPeriodFromDate(new Date(document.date), delta);
                if (acc && (document.category.code in acc)){
                    if (period in acc[document.category.code]) {
                        acc[document.category.code][period].push(document);
                    } else {
                        acc[document.category.code][period] = [document];
                    }
                } else {
                    acc[document.category.code] = { [period]: [document]};
                    categoryCodeToName[document.category.code] = document.category.display;
                }
                if (acc && ('maintimeline' in acc)){
                    if (period in acc.maintimeline) {
                        acc.maintimeline[period].push(document);
                    } else {
                        acc.maintimeline[period] = [document];
                    }
                }
                else {
                    acc.maintimeline = { [period]: [document]};
                }
            }
            return acc;
        }, []);
    }

    if (Object.keys(aggregatedQRData).length > 0) {
        logger.info(`Nombre de questionnaires & réponses trouvée(s) : ${Object.keys(aggregatedQRData).length}`);

        // Tri des sous-timelines par ordre décroissant de nb de docs
        const docCountsByCode = {};
        for (const [code, qrByCode] of Object.entries(aggregatedQRData)) {

            let count = 0;
            for (const [period, lrListByPeriod] of Object.entries(qrByCode)) {
                count = count + lrListByPeriod.length;
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
                finalResultsByCode[(code[0] === 'maintimeline') ? mainTimelineName : code[0]] = aggregatedQRData[code[0]];
                return;
            }
            const qrByCode = aggregatedQRData[code[0]];
            for (const [period, qrListByPeriod] of Object.entries(qrByCode)) {
                if (!(period in aggregatedSubTimeline)) {aggregatedSubTimeline[period] = [];}
                aggregatedSubTimeline[period] = aggregatedSubTimeline[period].concat(qrListByPeriod);
            }
        });
        // tri de l'aggrégat
        for (const [period, qrListByPeriod] of Object.entries(aggregatedSubTimeline)) {
            aggregatedSubTimeline[period] = qrListByPeriod.sort((a,b) => {
                return new Date(a.date) - new Date(b.date);
            });
        }
        Object.entries(aggregatedSubTimeline).sort();
        if (Object.keys(aggregatedSubTimeline).length) {
            finalResultsByCode.autres = aggregatedSubTimeline;
            categoryCodeToName.autres = 'autres';
        }

        let mainTimeline = null;
        const subTimelines = [];
        for (const [code, qrByCode] of Object.entries(finalResultsByCode)) {

            for (const [period, valuesByPeriod] of Object.entries(qrByCode)){
                valuesByPeriod.sort((a,b) => {
                    return new Date(a.date) - new Date(b.date);
                });
            }

            // sort periods
            Object.entries(qrByCode).sort();

            const eventsQR = [];
            for (const [period, qrByPeriod] of Object.entries(qrByCode)) {
                const timeRange = getEventTimeRange(qrByPeriod[0].date, qrByPeriod[qrByPeriod.length - 1].date, delta);
                const event = { qr : formatQuestionnaireResponseEvents(qrByPeriod, code === mainTimelineName ? mainTimelineName : categoryCodeToName[code])};
                const timeRangeEvent = new TimeRangeEvent(timeRange, event);
                eventsQR.push(timeRangeEvent);
            }

            eventsQR.sort((a,b) => {
                return new Date(a.begin()) - new Date(b.begin());
            });

            if (code === mainTimelineName) {
                mainTimeline = new TimeSeries({
                    name: mainTimelineName,
                    events: eventsQR,
                });
            } else {
                subTimelines.push(new TimeSeries({
                    name: categoryCodeToName[code],
                    events: eventsQR,
                }));
            }
        }

        return {mainTimeline : mainTimeline, subTimelines : subTimelines};

    } else {
        logger.info(`Pas de Questionnaire Responses trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return {mainTimeline : null, subTimelines : []};
    }
};

module.exports = {
    aggregateTimelineQR,
};
