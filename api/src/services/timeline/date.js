import logger from '@tools/logger';
import { TimeSeries, TimeRange, TimeRangeEvent } from 'pondjs';
const moment = require('moment');

/**
* getWeek() Returns the ISO week of the date, counting by week or by couples of week
* @param { date } is the date
* @param { pairWeek } is a boolean to check if we want to count the weeks by 2 or 1, false by default
*/
const getWeek = (dateParam, pairWeek = false) => {
    //We're checking if we want to count the weeks by two or by one
    const daysInWeek = pairWeek ? 14 : 7;

    if (!(dateParam instanceof Date)){
        logger.error(`Error type with ${dateParam}`);
        throw `Error type with ${dateParam}`;
    }

    const dateToExtract = new Date(dateParam.getTime());

    dateToExtract.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    dateToExtract.setDate(dateToExtract.getDate() + 3 - (dateToExtract.getDay() + 6) % daysInWeek);
    // January 4 is always in week 1.
    const week1 = new Date(dateToExtract.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((dateToExtract.getTime() - week1.getTime()) / 86400000
                          - 3 + (week1.getDay() + 6) % daysInWeek) / daysInWeek);
};


/**
* getWeekYear() Returns the four-digit year corresponding to the ISO week of the date
* @param { date } is the date
*/
const getWeekYear = (date) => {
    const dateToExtract = new Date(dateToExtract.getTime());
    dateToExtract.setDate(dateToExtract.getDate() + 3 - (dateToExtract.getDay() + 6) % 7);
    return dateToExtract.getFullYear();
};

/**
* getOldRecentDatesDocuments() Calculating the oldest and the most recent date from a patient's data
* @param { date } is the date
*/
const getOldRecentDatesDocuments = (patient) => {
    const sb = [
        'labResults',
        'clinicalReports',
        'medicationAdministrations',
        'procedures',
        'pmsis',
        'questionnaireResponses',
        'bacteriology',
    ];

    const dates = [];
    for (const [sbKey, sbValue] of Object.entries(patient)) {
        if (sb.includes(sbKey)){
            sbValue.forEach(elem => {
                elem.effectiveDateTime && dates.push(elem.effectiveDateTime);
                elem.issued && dates.push(elem.issued);
                elem.created && dates.push(elem.created);
                elem.authored && dates.push(elem.authored);
            });
        }
    }

    const oldestDate = dates.reduce((currVal, acc) =>
        Date.parse(acc) < Date.parse(currVal) ? acc : currVal
    );

    const mostRecentDate = dates.reduce((currVal, acc) =>
        Date.parse(acc) > Date.parse(currVal) ? acc : currVal
    );

    return {
        oldest : oldestDate,
        recent : mostRecentDate,
    };
};

/**
* getOldRecentDatesEncounter() Calculating the oldest and the most recent date from a patient encounter's data
* @param { date } is the date
*/
const getOldRecentDatesEncounters = (encounters) => {

    const eventsList = encounters.reduce((acc, curr) => {

        acc.push(curr?.period?.start);
        acc.push(curr?.period?.end);

        if (typeof curr?.location !== 'undefined' && curr?.location.length > 0) {
                curr?.location.forEach(e => {
                    acc.push(curr?.period?.start);
                    acc.push(curr?.period?.end);
                });
        }

        return acc;
    }, []);

    eventsList.sort((a,b) => {
        return new Date(a) - new Date(b);
    });

    return {
        oldest : eventsList[0],
        recent : eventsList[eventsList.length - 1],
    };
};


/**
* dateDiffDays() Calculating the difference between 2 dates
* @param { date1 & date2 } are the dates
*/
const dateDiffDays = (startDate , endDate) => {

    const dt1 = new Date(startDate);
    const dt2 = new Date(endDate);

    return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate()) ) / (1000 * 60 * 60 * 24));
};

/**
* getEventTimeRange() get a TimeRange object for a date
* @param { delta } is an integer
*/
const getEventTimeRange = (dateStart, dateEnd, delta) => {
    let end;
    const start = moment(dateStart);
    if (delta <= 31) {
        end = moment(dateEnd).add(23, 'hours');
    }
    else if (delta > 31 && delta <= 183) {
        end = moment(dateEnd).add(23, 'hours');
    }
    else if (delta > 183 && delta < 365) {
        end = moment(dateEnd).add(23, 'hours');
    }
    else if (delta >= 365 && delta <= 1825) {
        end = moment(dateEnd).add(23, 'hours');
    }
    else if (delta > 1825) {
        end = moment(dateEnd).add(23, 'hours');
    }
    const minimalWidthPct = 0.01;
    const nbDays = moment.duration(end - start).asDays();
    if (nbDays / delta < minimalWidthPct) {
        end = moment(dateStart).add(Math.max(1, Math.floor(minimalWidthPct * delta)), 'days');
    }
    return new TimeRange(new Date(start),  new Date(end));
};

/**
* isDateBetween() get a TimeRange object for a date
* @param { start & end } are the dates of the documet
* @param { startDate & endDate } are the dates of the request (URL)
*/
const isDateBetween = (start, end, startDate , endDate) => {
    if ( (moment(start).isSame(moment(startDate)) || moment(start).isAfter(moment(startDate)) ) && (moment(end).isSame(moment(endDate)) || moment(end).isBefore(moment(endDate))) ) {
        return true;
    }
    else {
        return false;
    }
};

const getAggregationPeriodFromDate = (date, delta) => {
    //More than 7 days and less than 1 month, aggregation by day
    if (delta <= 62) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;}
    //More than 1 month and less than 6 months, aggregation by week
    else if (delta > 62 && delta <= 183) { return `${date.getFullYear()}-${getWeek(date,false)}`;}
    //More than 6 months and less than one year, aggregation by couple of weeks
    else if (delta > 183 && delta < 365) { return `${date.getFullYear()}-${getWeek(date,false)}`;}
    //One year, more than one year and less than 5 years, aggregation by month
    else if (delta >= 365 && delta <= 1825) {return `${date.getFullYear()}-${getWeek(date,false)}`;}  // ${date.getUTCMonth() + 1}`;}
    //More than 5 years, aggregation by year
    else if (delta > 1825) { return `${date.getFullYear()}-${date.getUTCMonth() + 1}`;}
};

const logAggregationForFhirType = (fhirType, delta, startDate, endDate) => {
    if (delta <= 31) {
        logger.info(`Aggregation des ${fhirType} par jour du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
    }
    //More than 1 month and less than 6 months, aggregation by week
    else if (delta > 31 && delta <= 183) {
        logger.info(`Aggregation des ${fhirType} par semaine du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
    }
    //More than 6 months and less than one year, aggregation by couple of weeks
    else if (delta > 183 && delta < 365) {
        logger.info(`Aggregation des ${fhirType} par paire de semaine du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
    }
    //One year, more than one year and less than 5 years, aggregation by month
    else if (delta >= 365 && delta <= 1825) {
        logger.info(`Aggregation des ${fhirType} par mois du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
    }
    //More than 5 years, aggregation by year
    else if (delta > 1825) {
        logger.info(`Aggregation des ${fhirType} par année du ${moment(startDate).format('DD-MM-YYYY')} au ${moment(endDate).format('DD-MM-YYYY')}`);
    }
};


module.exports = {
    getWeek,
    getWeekYear,
    getOldRecentDatesDocuments,
    getOldRecentDatesEncounters,
    dateDiffDays,
    getEventTimeRange,
    isDateBetween,
    getAggregationPeriodFromDate,
    logAggregationForFhirType,
};
