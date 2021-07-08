import _ from 'lodash';
import moment from  'moment';
import { TimeSeries, TimeRangeEvent } from 'pondjs';
import logger from '@tools/logger';

import {
    dateDiffDays,
    isDateBetween,
    getEventTimeRange,
    getAggregationPeriodFromDate,
    logAggregationForFhirType,
} from '@timeline/date.js';

import {
    formatPMSIEvents,
} from '@timeline/fhirToFront.js';



/**
 * aggregateTimelinePmsi() Calculating the difference between 2 dates to aggregate the results following business logic rules
 * @param { date1 & date2 } are the dates
 * @param { patient } is a Patient type of data
 * @param { sbType } is the type of sb
 */
const aggregateTimelinePmsi = (startDateP, endDateP, pmsisP) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;

    const delta = (startDate instanceof Date && endDate instanceof Date) && dateDiffDays(startDate, endDate);

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || pmsiTimeline.js');
    }
    logAggregationForFhirType('PMSI', delta, startDate, endDate);

    let aggregatedPmsiData = {};
    // Aggregation des données par date
    if (typeof pmsisP !== 'undefined' && pmsisP.length > 0) {
        aggregatedPmsiData = pmsisP.reduce((acc, doc)=>{
            if (isDateBetween(doc.date, doc.date, startDate, endDate)){
                const dateResult = new Date(doc.date);
                const period = getAggregationPeriodFromDate(dateResult, delta);
                const day = dateResult.toLocaleString('en-GB', {year: 'numeric', day: 'numeric', month: 'numeric'});

                if (acc && (doc.type in acc)){
                    if (period in acc[doc.type]) {
                        if (day in acc[doc.type][period]) {
                            acc[doc.type][period][day].push(doc);
                        } else {
                            acc[doc.type][period][day] = [doc];
                        }
                    } else {
                        acc[doc.type][period] = {[day]: [doc]};
                    }
                } else {
                    acc[doc.type] = { [period]: {[day]: [doc]} };
                }
                if (acc && ('maintimeline' in acc)){
                    if (period in acc.maintimeline) {
                        if (day in acc.maintimeline[period]) {
                            acc.maintimeline[period][day].push(doc);
                        } else {
                            acc.maintimeline[period][day] = [doc];
                        }
                    } else {
                        acc.maintimeline[period] = {[day]: [doc]};}
                }
                else {
                    acc.maintimeline = {[period] : {[day]: [doc]}};
                }
            }
            return acc;
        }, {});
    }

    // formation de la timeline et des sous-timelines
    if (Object.keys(aggregatedPmsiData).length > 0 ) {
        logger.info(`Nombre de PMSI trouvée(s) : ${Object.keys(aggregatedPmsiData).length}`);

        // sort periods
        for (const [type, dataByType] of Object.entries(aggregatedPmsiData)) {
            for (const [period, dataByTypeByPeriod] of Object.entries(dataByType)) {
                Object.entries(dataByTypeByPeriod).sort((a,b) => {
                    return new Date(a[0]) - new Date(b[0]);
                });
            }
            Object.entries(dataByType).sort((a,b) => {
                return new Date(Object.keys(a[1])[0]) - new Date(Object.keys(b[1])[0]);
            });
        }

        let mainTimeline = null, unsortedSubTimelines = {};
        for (const [type, dataByType] of Object.entries(aggregatedPmsiData)) {
            const events = [];
            for (const [period, dataByTypeByPeriod] of Object.entries(dataByType)) {
                const timeRange = getEventTimeRange(Object.values(dataByTypeByPeriod)[0][0].date,
                    Object.values(dataByTypeByPeriod)[Object.values(dataByTypeByPeriod).length - 1][0].date,
                    delta);
                const event = { pmsis : formatPMSIEvents(dataByTypeByPeriod, (type === 'maintimeline') ? 'PMSI' : type) };
                const timeRangeEvent = new TimeRangeEvent(timeRange, event);
                events.push(timeRangeEvent);
            }

            // Sorting chronological order
            events.sort((a,b) => {
                return new Date(a.begin()) - new Date(b.begin());
            });

            const timeSeries = new TimeSeries({
                name: (type === 'maintimeline') ? 'PMSI' : type,
                events: events,
            });

            if (type === 'maintimeline') {
                mainTimeline = timeSeries;
            } else {
                unsortedSubTimelines[type] = timeSeries;
            }
        }

        // mise dans le bon ordre
        const subTimelines = [];
        if ('DP' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.DP);}
        if ('DAS' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.DAS);}
        for (const [key, value] of Object.entries(unsortedSubTimelines)) {
            if (!['DP', 'DAS', 'UNKNOWN_TYPE', 'autres'].includes(key)) {subTimelines.push(value);}
        }
        if ('autre' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.autre);}
        if ('UNKNOWN_TYPE' in unsortedSubTimelines) {subTimelines.push(unsortedSubTimelines.UNKNOWN_TYPE);}

        return { mainTimeline : mainTimeline, subTimelines : subTimelines};

    } else {
        logger.info(`Pas de PMSIS trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return { mainTimeline : null, subTimelines : []};
    }

};

module.exports = {
    aggregateTimelinePmsi,
};
