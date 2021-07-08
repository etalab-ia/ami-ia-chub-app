import moment from  'moment';

import {
    isDateBetween,
} from '@timeline/date.js';

import {
    getEncounterFromFhir,
    getFrontPMSIFromFhir,
    getFrontQuestionnaireResponseFromFhir,
    getFrontLabResultFromFhir,
    getFrontClinicalReportFromFhir,
    getFrontBacteriologyFromFhir,
    getFrontMedicationAdmFromFhir,
    getFrontPMSIsuggestions,
    getFrontQuestionnaireResponsesuggestions,
    getFrontLabResultsuggestions,
    getFrontClinicalReportsuggestions,
    getFrontBacteriologysuggestions,
    getFrontMedicationsuggestions,
} from '@timeline/fhirToFront.js';

/**
 *  Define ES index mapping
 **/
const getElasticMapping = () => {
    return {
        'mappings': {
            'properties': {
                'documentType': {
                    'type': 'text',
                },
                'documentStartDate': {
                    'type': 'date',
                    'format': 'strict_date_optional_time||yyyyMMdd||yyyyMM',
                },
                'documentEndDate': {
                    'type': 'date',
                    'format': 'strict_date_optional_time||yyyyMMdd||yyyyMM',
                },
                'fullDocument': {
                    'type': 'object',
                    'enabled': false,
                },
                'abstract' : {
                    'type': 'text',
                    'norms': false,
                    'analyzer': 'doc_analyzer',
                },
                'suggest' : {
                    'type': 'completion',
                },
            },
        },
        'settings': {
            'index': {
                'refresh_interval': '-1',
                'number_of_shards': '1',
                'analysis': {
                    'analyzer': {
                        'doc_analyzer': {
                            'filter': ['lowercase', 'asciifolding'],
                            'tokenizer': 'standard',
                        },
                    },
                },
                'number_of_replicas': '1',
            },
        },
    };
};

/**
 *  Transforms a list of suggestions for autocomplete in another list of suggestions
 *
 * @param {string[]} suggestions list of suggestions
 * @returns {string[]} list of suggestions
 **/
const breakSuggestionsToSingleWords = (suggestions) => {
    let brokenDown = [];
    suggestions.forEach(sugg => {
        brokenDown = brokenDown.concat(sugg.split(' '));
    });
    return [... new Set(suggestions.concat(brokenDown))].map(v => v.toLowerCase());
};

/**
 *  Transforms a FHIR document into a document to insert into ES
 *
 * @param {fhirDocument} fhirDocument document to transform
 * @param {string} fhirType type of the document
 * @param {number[]} encountersList list of encounters found in FHIR PMSI docs (used to transform FHIR Encounters)
 * @returns {Doc[]} list of documents to insert into ES, where Doc = {
                documentStartDate : date
                documentEndDate : date
                documentType: fhirType,
                fullDocument: fhirDocument as string
                abstract: dict of searchable entities as string
                suggest: string[] for autocomplete
            };
 **/
const fhirToElastic = (fhirDocument, fhirType, encountersList) => {
    try {
        let abstractFunc, suggestionsFunc;
        switch (fhirType) {
        case 'patient':
            abstractFunc = function(d) { return d;};
            suggestionsFunc = function(d) { return [];};
            break;
        case 'encounter':
            abstractFunc = function(d) { return getEncounterFromFhir(d, encountersList);};
            suggestionsFunc = function(d) { return [];};
            break;
        case 'pmsis':
            abstractFunc = getFrontPMSIFromFhir;
            suggestionsFunc = getFrontPMSIsuggestions;
            break;
        case 'questionnaireResponses':
            abstractFunc = getFrontQuestionnaireResponseFromFhir;
            suggestionsFunc = getFrontQuestionnaireResponsesuggestions;
            break;
        case 'medicationAdministrations':
            abstractFunc = getFrontMedicationAdmFromFhir;
            suggestionsFunc = getFrontMedicationsuggestions;
            break;
        case 'clinicalReports':
            abstractFunc = getFrontClinicalReportFromFhir;
            suggestionsFunc = getFrontClinicalReportsuggestions;
            break;
        case 'labResults':
            abstractFunc = getFrontLabResultFromFhir;
            suggestionsFunc = getFrontLabResultsuggestions;
            break;
        case 'bacteriology':
            abstractFunc = getFrontBacteriologyFromFhir;
            suggestionsFunc = getFrontBacteriologysuggestions;
            break;
        default:
            throw new Error(`FHIR type ${fhirType} not recogized`);
        }

        let abstracts = abstractFunc(fhirDocument);
        if (!Array.isArray(abstracts)) {abstracts = [abstracts];}
        return abstracts.map( (doc) => {
            return {
                documentStartDate : doc.date || doc.start,
                documentEndDate : doc.date || doc.end,
                documentType: fhirType,
                fullDocument: JSON.stringify(fhirDocument),
                abstract: JSON.stringify(doc),
                suggest: breakSuggestionsToSingleWords(suggestionsFunc(doc)),
            };
        });
    } catch ( err ) {
        throw new Error(`Error for ${fhirType} - ${fhirDocument} : ${err}`);
    }
};


/**
 *  Transforms ES hits into documents for process
 *
 * @param {EsHit[]} elasticResults list of hits to process
 * @param {Dict} resultDict dict to fill in
 * @returns {docType : doc[]} list of documents indexed by docType, where doc is the result of fhirToFront.get...FromFhir
 **/
const readElasticResults = (elasticResults, resultDict) => {
    const results = elasticResults.reduce((acc, curr) => {
        if (!(curr._source.documentType in acc)) {acc[curr._source.documentType] = [];}
        const doc = JSON.parse(curr._source.abstract);
        doc.es_score = curr._score;
        acc[curr._source.documentType].push(doc);
        return acc;
    }, resultDict);
    return results;
};


module.exports = {
    getElasticMapping,
    fhirToElastic,
    readElasticResults,
};
