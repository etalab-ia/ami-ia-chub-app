import _ from 'lodash';
import moment from  'moment';
import { TimeSeries, TimeRangeEvent } from 'pondjs';
import logger from '@tools/logger';

import {
    dateDiffDays,
    getWeek,
    isDateBetween,
    getEventTimeRange,
    getAggregationPeriodFromDate,
    logAggregationForFhirType,
} from '@timeline/date.js';

import {
    formatBacteriologyEvents,
} from '@timeline/fhirToFront.js';


/** aggregateTimelineBacteriology() Calculating the difference between 2 dates to aggregate the results following business logic rules
* @param { date1 & date2 } are the dates
* @param { bacteriologyP } is a Patient bacteriology array
*/
const aggregateTimelineBacteriology = (startDateP, endDateP, bacteriologyP) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;

    const delta = (startDate instanceof Date && endDate instanceof Date) && dateDiffDays(startDate, endDate);

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || bacteriologyTimeline.js');
    }
    logAggregationForFhirType('Bacteriology', delta, startDate, endDate);

    let bacteriologyByPeriod = {};
    if (typeof bacteriologyP !== 'undefined' && bacteriologyP.length > 0) {
        bacteriologyByPeriod = bacteriologyP.reduce((acc, document)=>{
            if (isDateBetween(document.date, document.date, startDate, endDate)){
                const dateResult = new Date(document.date);
                const period = getAggregationPeriodFromDate(dateResult, delta);
                if (acc && (period in acc)) {
                    acc[period].push(document);
                } else {
                    acc[period] = [document];
                }
            }
            return acc;
        }, {});
    }

    if (Object.keys(bacteriologyByPeriod).length > 0) {
        logger.info(`Nombre de Bacteriology trouvé(s) : ${Object.keys(bacteriologyByPeriod).length}`);

        // sort events in periods
        for (const [period, valuesByPeriod] of Object.entries(bacteriologyByPeriod)){
            valuesByPeriod.sort((a,b) => {
                return new Date(a.date) - new Date(b.date);
            });
        }

        // sort periods
        Object.entries(bacteriologyByPeriod).sort((a,b) => {
            return new Date(Object.values(a)[1][0].date) - new Date(Object.values(b)[1][0].date);
        });

        const eventsBacterio = [];
        for (const [period, valuesByPeriod] of Object.entries(bacteriologyByPeriod)){
            const timeRange = getEventTimeRange(moment(valuesByPeriod[0].date),
                moment(valuesByPeriod[valuesByPeriod.length - 1].date),
                delta);
            const event = { bacteriology : formatBacteriologyEvents(valuesByPeriod, 'Bactériologie')};
            const timeRangeEvent = new TimeRangeEvent(timeRange, event);
            eventsBacterio.push(timeRangeEvent);
        }

        eventsBacterio.sort((a,b) => {
            return new Date(a.begin()) - new Date(b.begin());
        });

        const timeSeries = new TimeSeries({
            name: 'Bacteriologie',
            events: eventsBacterio,
        });

        return { mainTimeline: timeSeries};
    } else {
        logger.info(`Pas de Bacteriology trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return { mainTimeline: null };
    }
};


module.exports = {
    aggregateTimelineBacteriology,
};
