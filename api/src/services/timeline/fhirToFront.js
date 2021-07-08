import _ from 'lodash';
import moment from  'moment';

import {
    transformQuestionnaireResults, getQrTypeFromContext, getQrCategoryFromContext,
} from '@services/questionnaireResponse.js';


/*
 *  These functions code, for each type of FHIR resource,
 *      - what to extract from them  (get...FromFhir)
 *      - what to index for autocomplete (getFront...Suggestions)
 *      - how to format aggregated documents if necessary (format...Events)
 */

const getEncounterFromFhir = (fhirDocument, encountersList) => {
    if (typeof fhirDocument?.location !== 'undefined' && fhirDocument?.location.length > 0) {

        return fhirDocument?.location.map(e => {
            const start = new Date(e?.period?.start);
            const end = new Date(e?.period?.end);

            return {
                id : fhirDocument?.id,
                identifier : fhirDocument?.identifier[0]?.system,
                type : fhirDocument?.type[0]?.text,
                display : e?.location?.display,
                start : e?.period?.start,
                end : e?.period?.end,
                consultation : encountersList.includes(fhirDocument?.id) ? false : true,
                hospitalisation : encountersList.includes(fhirDocument?.id) ? true : false,
                oneDay : moment(start).isSame(moment(end)) ? true : false,
            };


        });
    }
    return [];
};

const getFrontPMSIFromFhir = (fhirDocument) => {
    let documents = [];
    if (fhirDocument.diagnosis && fhirDocument.diagnosis.length) {
        documents = documents.concat(fhirDocument.diagnosis.map( (diagnosis) => {
            return {
                date : moment(fhirDocument.created).toISOString(),
                type: diagnosis.hasOwnProperty('type') ? diagnosis.type[0]?.coding[0]?.code.split('|')[1] : 'UNKNOWN_TYPE',
                diagnosisCode: diagnosis.diagnosisCodeableConcept.coding[0].code,
                diagnosisDisplay: diagnosis.diagnosisCodeableConcept.coding[0].display,
            };
        }));
    }
    if (fhirDocument.procedure && fhirDocument.procedure.length) {
        documents = documents.concat(fhirDocument.procedure.map( (procedure) => {
            return {
                date : moment(fhirDocument.created).toISOString(),
                type: 'DIAG',
                diagnosisCode: procedure.procedureCodeableConcept.coding[0].code,
                diagnosisDisplay: procedure.procedureCodeableConcept.coding[0].display,
            };
        }));
    }
    return documents;
};

const getFrontPMSIsuggestions = (frontDocument) => {
    const values = [
        frontDocument.type,
        frontDocument.diagnosisCode,
        frontDocument.diagnosisDisplay,
    ];
    return values;
};

const formatPMSIEvents = (pmsiEvents, eventType) => {
    const events = [];
    for (const [key, values] of Object.entries(pmsiEvents)) {
        events.push({
            date: moment(key, 'DD/MM/YYYY').toISOString(),
            type: eventType,
            documents: values,
        });
    }
    return events;
};


const getFrontQuestionnaireResponseFromFhir = (fhirDocument) => {
    const newStruct = transformQuestionnaireResults(fhirDocument);

    const document = {
        identifier : fhirDocument.identifier.value,
        date : moment(fhirDocument.authored).toISOString(),
        type : getQrTypeFromContext(fhirDocument.context),
        category: getQrCategoryFromContext(fhirDocument.context),
        qrList : newStruct,
    };
    return document;
};

const _getQRTitles = (node) => {
    let titles = [];
    if (node?.code) {
        titles.push(node.code);
    }
    if (!('children' in node)) {
        if (isNaN(node.title)) { titles.push(node.title);}
    } else {
        if (node?.title) {
            if (!(['QuestionnaireResponse', ' '].includes(node.title))) {
                titles.push(node.title);
            }
        }

        titles = titles.concat(_.flatMap(node.children, _getQRTitles));
        titles = [...new Set(titles.reduce( (acc, val) => {if (isNaN(val)) {acc.push(val);} return acc;}, []))];
        return titles;
    }
    return titles;
};

const getFrontQuestionnaireResponsesuggestions = (frontDocument) => {
    let values = [
        frontDocument.category.display,
    ];
    values = values.concat(_getQRTitles(frontDocument.qrList));
    return values;
};

const formatQuestionnaireResponseEvents = (qrEvents, eventType) => {
    return qrEvents.map( (values) => {
        values.type = eventType;
        return values;
    });
};

const getFrontLabResultFromFhir = (fhirDocument) => {
    const categoryCode = fhirDocument?.category[0]?.coding[0]?.code ? fhirDocument?.category[0]?.coding[0]?.code : 'undefined';
    const categoryDisplay = fhirDocument?.category[0]?.coding[0]?.display ? fhirDocument?.category[0]?.coding[0]?.display : 'undefined';
    const code = fhirDocument?.code?.coding[0]?.code;
    const label = fhirDocument?.code?.coding[0]?.display;
    const valueQuantity = fhirDocument?.valueQuantity;
    const refRange = fhirDocument?.referenceRange[0]?.text;

    const document = {
        categoryCode: categoryCode,
        categoryDisplay: categoryDisplay,
        code : code,
        label : label,
        date : moment(fhirDocument.effectiveDateTime).toISOString(),
        valueQuantity : valueQuantity,
        referenceRange: refRange,
    };
    return document;
};

const getFrontLabResultsuggestions = (frontDocument) => {
    const values = [frontDocument.categoryDisplay, frontDocument.code];
    if (frontDocument?.label) { values.push(frontDocument.label);}
    return values;
};

const formatLabResultEvents = (labResultEvents, eventType) => {
    const events = [];
    for (const [key, values] of Object.entries(labResultEvents)) {
        events.push({
            date: moment(key, 'DD/MM/YYYY').toISOString(),
            type: eventType,
            documents: values,
        });
    }
    return events;
};

const getFrontClinicalReportFromFhir = (fhirDocument) => {
    const categoryCode = fhirDocument?.category.coding[0].code ? fhirDocument?.category.coding[0].code : 'undefined';
    const categoryDisplay = fhirDocument?.category.coding[0].display ? fhirDocument?.category.coding[0].display : 'undefined';
    const display = fhirDocument?.code.coding[0].display;
    const conclusion = fhirDocument?.conclusion;

    const document = {
        categoryCode : categoryCode,
        categoryDisplay: categoryDisplay,
        display : display,
        date : fhirDocument.issued,
        conclusion : conclusion,
    };
    return document;
};

const getFrontClinicalReportsuggestions = (frontDocument) => {
    const values = [frontDocument.categoryCode, frontDocument.categoryDisplay, frontDocument.display];
    return values;
};

const formatClinicalReportEvents = (clinicalReportEvents, eventType) => {
    return clinicalReportEvents.map( (values) => {
        values.type = eventType;
        return values;
    });
};

const getFrontBacteriologyFromFhir = (fhirDocument) => {
    let issueDate = null;
    let examens = [];
    let results = [];
    const observations = [];
    fhirDocument.entry.forEach((entry) => {
        // console.log(entry);
        if (entry?.resource.resourceType === 'DiagnosticReport') {
            issueDate = entry?.resource.issued;
            examens = entry?.resource?.category?.coding?.map( (val) => {
                return val.display || val.code;
            });
        }
        if (entry?.resource.result) {
            results = entry?.resource?.result.map( (val) => {
                return val.display;
            });
        }
        if (entry?.resource.resourceType === 'Observation') {
            const observation = {
                code: entry?.resource.code.coding[0].display || entry?.resource.code.coding[0].code,
                interpretation: '',
                value: '',
            };

            if (entry.resource?.interpretation) {
                observation.interpretation = entry.resource?.interpretation.coding[0].display;
            }
            if (entry?.resource?.component) {
                if (entry?.resource?.component[0].valueString) {
                    observation.value = entry?.resource?.component[0].valueString;
                }
            }
            if (entry?.resource?.valueQuantity && entry?.resource?.valueQuantity.value) {
                const value = entry?.resource?.valueQuantity?.value;
                const unit = entry?.resource?.valueQuantity?.unit;
                observations.value = `${value} ${unit}`;
            }
            observations.push(observation);
        }
    });
    const document = {
        date : moment(issueDate).toISOString(),
        examens : examens,
        results: results,
        observations : observations,
    };
    return document;
};

const getFrontBacteriologysuggestions = (frontDocument) => {
    let values = frontDocument.examens || [];
    values = values.concat(frontDocument.result || []);
    frontDocument.observations.forEach( (obs) => {
        values.push(obs.code);
        if (obs.interpretation) {values.push(obs.interpretation);}
    });
    values = [...new Set(values)];
    return values;
};

const formatBacteriologyEvents = (cacteriologyEvents, eventType) => {
    return cacteriologyEvents.map( (values) => {
        values.type = eventType;
        return values;
    });
};

const getFrontMedicationAdmFromFhir = (fhirDocument) => {
    const medicationTime = (`${moment(fhirDocument?.effectiveDateTime).hours()}:${moment(fhirDocument?.effectiveDateTime).minutes()}`);
    const medicationReference = fhirDocument?.medicationReference?.reference;
    const medicaments = fhirDocument?.contained.map((med) => {
        return {
            medCode : med.code.coding[0].code,
            medName : med.code.text,
        };
    });

    const document = {
        date : moment(fhirDocument?.effectiveDateTime).toISOString(),
        medicationTime : medicationTime,
        medicationReference : medicationReference,
        medicaments : medicaments,
    };
    return document;
};

const getFrontMedicationsuggestions = (frontDocument) => {
    const values = frontDocument.medicaments.reduce( (acc, curr) => {
        acc.push(curr.medCode);
        acc.push(curr.medName);
        return acc;
    }, []);
    return values;
};

const formatMedicationAdmEvents = (medAdEvents, eventType) => {
    return medAdEvents.map( (values) => {
        return {
            date: moment(values[0].date).toISOString(),
            type: eventType,
            documents: values,
        };
    });
};

module.exports = {
    getEncounterFromFhir,
    getFrontPMSIFromFhir,
    getFrontPMSIsuggestions,
    formatPMSIEvents,
    getFrontQuestionnaireResponseFromFhir,
    getFrontQuestionnaireResponsesuggestions,
    formatQuestionnaireResponseEvents,
    getFrontLabResultFromFhir,
    getFrontLabResultsuggestions,
    formatLabResultEvents,
    getFrontClinicalReportFromFhir,
    getFrontClinicalReportsuggestions,
    formatClinicalReportEvents,
    getFrontBacteriologyFromFhir,
    getFrontBacteriologysuggestions,
    formatBacteriologyEvents,
    getFrontMedicationAdmFromFhir,
    getFrontMedicationsuggestions,
    formatMedicationAdmEvents,
};
