
import _ from 'lodash';

/**
 * Separate Medical QR from Paramedical based on doc.type.display
 * @param {FhirDocument[]} qrDocuments documents to analyze
 * @returns [FhirDocument[], FhirDocument[]] where 0 are medical, 1 paramedical
 */
const separateMedicalAndParamedicalQR = (qrDocuments) => {
    const qrMedical = [], qrParamedical = [];
    qrDocuments.forEach( (doc) => {
        if ((doc.type?.display !== undefined) && (doc.type.display === '1-Médical')) {
            qrMedical.push(doc);
        } else {
            qrParamedical.push(doc);
        }

    });
    return [qrMedical, qrParamedical];
};


/**
 * Get Qr type by decomposing fhir document context node
 * @param {FhirNode} contextNode context node to analyze
 * @returns {code: code, display: display}
 */
const getQrTypeFromContext = (contextNode) => {
    if (contextNode) {
        const code = contextNode.reference.split(' | ')[0];
        const display = contextNode.display.split(' | ')[0];
        return {code: code, display: display};
    }
    return {code: undefined, display: undefined};
};


/**
 * Get Qr Category by decomposing fhir document context node
 * @param {FhirNode} contextNode context node to analyze
 * @returns {code: code, display: display}
 */
const getQrCategoryFromContext = (contextNode) => {
    if (contextNode) {
        const code = contextNode.reference.split(' | ')[1];
        const display = contextNode.display.split(' | ')[1];
        return {code: code, display: display};
    }
    return {code: undefined, display: undefined};
};


/**
 * Recursively extract FhirDocument values as a tree
 * @param {FhirNode} item item to extract
 * @returns {
                key : key,
                title : title,
                children : [{key: ...}, {key: ...}, ...]
            }
 */
const transformQuestionnaireResults = (item) => {
    if (item?.status){
        //Formulaire
        // console.log('Formulaire : ' + item.text);
    }

    if (item?.answer){
        let titleQuestion = item.text;
        if (titleQuestion.includes('http://') || titleQuestion.includes('https://') || titleQuestion.includes('UNKNOWN')){
            titleQuestion = 'Question non trouvée';
        }
        const answers = item.answer.map((e, i) => {
            if (e?.valueCoding) {
                return {
                    title : e.valueCoding.display,
                    isLeaf: true,
                    code: e.valueCoding.code,
                    key : _.random(0, 9999999999),
                };
            }
            if (e?.valueString) {
                return {
                    title : e.valueString.replaceAll('NEWLINESEP', '\n'),
                    isLeaf: true,
                    key : _.random(0, 9999999999),
                };
            }
            if (e?.valueDecimal) {
                return {
                    title : e.valueDecimal.toString(),
                    isLeaf: true,
                    key : _.random(0, 9999999999),
                };
            }
        });
        return ({
            title : titleQuestion,
            code: item.definition,
            key : _.random(0, 9999999999),
            children : answers,
        });
    }
    else {
        let children = {};

        if (item?.item){
            children = item?.item.map((e) =>{
                return transformQuestionnaireResults(e);
            });
        }

        else {
            children = '';
        }

        return (
            {
                key : _.random(0, 9999999999),
                title : item.text ? item.text : item.resourceType,
                children : children,
            }
        );
    }
};


module.exports = {
    separateMedicalAndParamedicalQR,
    transformQuestionnaireResults,
    getQrTypeFromContext,
    getQrCategoryFromContext,
};
