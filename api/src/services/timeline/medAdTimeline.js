
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
    formatMedicationAdmEvents,
} from '@timeline/fhirToFront.js';


/**
 * aggregateTimelineMed() Calculating the difference between 2 dates to aggregate the results following business logic rules
 * @param { date1 & date2 } are the dates
 * @param { patient } is a Patient type of data
 * @param { sbType } is the type of sb
 */
const aggregateTimelineMedAd = (startDateP, endDateP, maP) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;

    const delta = (startDate instanceof Date && endDate instanceof Date) && dateDiffDays(startDate, endDate);

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || medAdTimeline.js');
    }
    logAggregationForFhirType('medication Administrations', delta, startDate, endDate);

    let maByPeriod = [];
    if (typeof maP !== 'undefined' && maP.length > 0) {
        maByPeriod = maP.reduce((acc, document)=>{
            if (isDateBetween(document.date, document.date, startDate, endDate)){
                const dateResults = new Date(document.date);
                const period = getAggregationPeriodFromDate(dateResults, delta);
                const day = dateResults.toLocaleString('en-GB', {year: 'numeric', day: 'numeric', month: 'numeric'});

                if (acc && (period in acc)) {
                    if (day in acc[period]) {
                        acc[period][day].push(document);
                    } else {
                        acc[period][day] = [document];
                    }
                } else {
                    acc[period] = { [day]: [document] };
                }
            }
            return acc;
        }, {});
    }

    if (Object.keys(maByPeriod).length > 0) {
        logger.info(`Nombre de Medication Administration trouvé(s) : ${Object.keys(maByPeriod).length}`);
        const eventsMa = [];
        for (const [date, ma] of Object.entries(maByPeriod)){
            // ma = _(ma).toPairs().sort((a,b) => {
            //     return moment(a[0], 'DD/MM/YYYY').toDate() - moment(b[0], 'DD/MM/YYYY').toDate();
            // }).fromPairs().value();

            const ordered = [];
            Object.values(ma).sort((a,b) => {
                return new Date(a[0].date) - new Date(b[0].date);
            }).forEach((v) => {
                ordered.push(v);
            });

            const timeRange = getEventTimeRange(moment(ordered[0][0].date),
                moment(ordered[ordered.length - 1][0].date),
                delta);
            const event = { ma : formatMedicationAdmEvents(ordered, 'Administrations médicamenteuses')};
            const timeRangeEvent = new TimeRangeEvent(timeRange, event);
            eventsMa.push(timeRangeEvent);
        }

        eventsMa.sort((a,b) => {
            return new Date(a.begin()) - new Date(b.begin());
        });

        const timeSeriesMa = new TimeSeries({
            name: 'Traitements',
            events: eventsMa,
        });
        return { mainTimeline : timeSeriesMa };
    } else {
        logger.info(`Pas de Medication Administration trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return { mainTimeline : null};
    }
};

module.exports = {
    aggregateTimelineMedAd,
};
