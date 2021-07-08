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

import { formatClinicalReportEvents } from '@timeline/fhirToFront.js';


/**
 * aggregateTimelineCR() Calculating the difference between 2 dates to aggregate the results following business logic rules
 * @param { date1 & date2 } are the dates
 * @param { clinicalReportsP } is a Patient clinicalReports array
 */
const aggregateTimelineCR = (startDateP, endDateP, clinicalReportsP) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;
    let aggregatedTimelines = {};
    const timeLinesCR = {};
    const codeToName = {};

    const delta = (startDate instanceof Date && endDate instanceof Date) && dateDiffDays(startDate, endDate);

    if (!(delta)){
        console.error('Delta can\'t be calculated, check the format of the date || clinicalReportsTimeline.js');
    }
    logAggregationForFhirType('Clinical Reports', delta, startDate, endDate);

    // Aggregation des données par date
    if (typeof clinicalReportsP !== 'undefined' && clinicalReportsP.length > 0) {
        aggregatedTimelines = clinicalReportsP.reduce((acc, document)=>{
            if (isDateBetween(document.date, document.date, startDate, endDate)){
                const period = getAggregationPeriodFromDate(new Date(document.date), delta);
                if (!(document.categoryCode in codeToName)) {codeToName[document.categoryCode] = document.categoryDisplay;}

                if (acc && (document.categoryCode in acc)){
                    if (period in acc[document.categoryCode]) {
                        acc[document.categoryCode][period].push(document);
                    } else {
                        acc[document.categoryCode][period] = [document];
                    }
                } else {
                    acc[document.categoryCode] = { [period]:  [document]  };
                }
                if (acc && ('maintimeline' in acc)){
                    if (period in acc.maintimeline) {
                        acc.maintimeline[period].push(document);
                    } else {
                        acc.maintimeline[period] = [document];
                    }
                }
                else {
                    acc.maintimeline = {[period] : [document]};
                }
            }
            return acc;
        }, {});
    }

    // formation de la timeline et des sous-timelines
    if (Object.keys(aggregatedTimelines).length > 0) {
        logger.info(`Nombre de Clinical Reports trouvé(s) : ${Object.keys(aggregatedTimelines).length}`);
        for (const [code, aggByCode] of Object.entries(aggregatedTimelines)) {
            const eventsReports = [];

            for (const [cr, crList] of Object.entries(aggByCode)) {
                crList.sort((a,b) => {
                    return new Date(a.date) - new Date(b.date);
                });

                const timeRange = getEventTimeRange(crList[0].date, crList[crList.length - 1].date, delta);
                const event = { clinicalReports : formatClinicalReportEvents([...crList], (code === 'maintimeline') ? 'Comptes Rendus' : codeToName[code])};
                const timeRangeEvent = new TimeRangeEvent(timeRange, event);
                eventsReports.push(timeRangeEvent);
            }
            eventsReports.sort((a,b) => {
                return new Date(a.begin()) - new Date(b.begin());
            });

            if (code === 'maintimeline') {
                timeLinesCR.mainTimeline = new TimeSeries({
                    name: 'Comptes Rendus',
                    events: eventsReports,
                });
            } else {
                if (!('subTimelines' in timeLinesCR)) {timeLinesCR.subTimelines = [];}
                timeLinesCR.subTimelines.push(new TimeSeries({
                    name: codeToName[code],
                    events: eventsReports,
                }));
            }
        }
        return timeLinesCR;
    } else {
        logger.info(`Pas de Clinical Reports trouvée pour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
        return { mainTimeline : null, subTimelines : []};
    }
};

module.exports = {
    aggregateTimelineCR,
};
