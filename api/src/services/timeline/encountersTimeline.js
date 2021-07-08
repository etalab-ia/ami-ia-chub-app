const moment = require('moment');
import { TimeSeries, TimeRange, TimeRangeEvent } from 'pondjs';
import _ from 'lodash';
import { isDateBetween } from '@services/timeline/date.js';
import logger from '@tools/logger';

/**
 * aggregateEncounter() Calculating the difference between 2 dates to aggregate the results following business logic rules
 * @param { date1 & date2 } are the dates
 * @param { patient } is a Patient type of data
 * @param { sbType } is the type of sb
 */
const aggregateEncounters = (startDateP, endDateP, encounters) => {

    const startDate = startDateP ? moment(startDateP, 'DD-MM-YYYY').toDate() : null;
    const endDate = endDateP ? moment(endDateP, 'DD-MM-YYYY').toDate() : null;

    const eventsList = _.filter(encounters, function(curr) {
        return new Date(curr.start) < endDate || new Date(curr.end) > startDate;
        // return isDateBetween(curr.start, curr.end, startDate, endDate);
    });

    //It has to be in chronological order
    eventsList.sort((a,b) => {
        return new Date(a.start) - new Date(b.start);
    });

    const hospitalisationList = [];
    const oneDayList = [];

    const groupByDay = _.groupBy(eventsList, function (e) {
        if (e.oneDay){
            return e.start;
        }
    });

    //On regroupe les evenements d'un jour qui se sont passé le même jour dans un seul "event", demande formulée par Cyril en attendant réponse métier
    for (const [key, value] of Object.entries(groupByDay)) {
        const end = moment(value[0].end).add(23, 'hours');
        const timeRange = (value[0]?.start && end) && new TimeRange(new Date(value[0]?.start), new Date(end));
        if (value.length === 1 && value[0].oneDay){
            const timeRangeEvent = new TimeRangeEvent(timeRange, value[0]);
            oneDayList.push(timeRangeEvent);
        } else if (value.length > 1 && value[0].oneDay) {
            const event = {
                id : undefined,
                start : value[0]?.start,
                identifier : value[0]?.identifier,
                consultation : undefined,
                reference : undefined,
                oneDay : true,
                type : value[0]?.type,
                end : value[0]?.end,
                sameDayEvents : value,
            };
            const timeRangeEvent = new TimeRangeEvent(timeRange, event);
            oneDayList.push(timeRangeEvent);
        }
    }

    //Map needs a return but using foreach can mute the initial value so I've choose map(). Feel free to replace map by foreach()
    eventsList.map( event => {
        if (event.oneDay === false){
            const timeRange = (event.start && event.end) && new TimeRange(new Date(event.start), new Date(event.end));
            const timeRangeEvent = new TimeRangeEvent(timeRange, event);
            hospitalisationList.push(timeRangeEvent);
        }
    });

    logger.info(`Nombre d'hospitalisation trouvée(s) : ${hospitalisationList.length}` );
    logger.info(`Nombre de consultation trouvée(s) : ${oneDayList.length}` );

    const seriesHospitalisation = new TimeSeries({
        name : 'Hospitalisation',
        events: hospitalisationList,
    });

    const seriesConsultation = new TimeSeries({
        name : 'Consultation & hospitalisation d\'une journée',
        events: oneDayList,
    });


    return {
        hospitalisation : seriesHospitalisation,
        consultation : seriesConsultation,
    };
};


module.exports = {
    aggregateEncounters,
};
