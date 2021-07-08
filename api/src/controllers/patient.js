/* eslint-disable no-eval */
import express from 'express';
import logger from '@tools/logger';
import Config from 'config';
import moment from 'moment';
import _ from 'lodash';
import jwtAuthMiddleware from '@middleware/jwt-auth.middleware';
import { Fhir } from '@tools/Fhir.js';
import { getOldRecentDatesEncounters, getOldRecentDatesDocuments } from '@timeline/date.js';
import { aggregateTimelinePmsi } from '@timeline/pmsiTimeline.js';
import { aggregateTimelineQR } from '@timeline/qrTimeline.js';
import { aggregateEncounters } from '@timeline/encountersTimeline.js';
import { aggregateTimelineMedAd } from '@timeline/medAdTimeline.js';
import { aggregateTimelineLabResults } from '@timeline/labResultsTimeline.js';
import { aggregateTimelineBacteriology } from '@timeline/bacteriologyTimeline.js';
import { aggregateTimelineCR } from '@timeline/clinicalReportsTimeline.js';
import { getEncountersInPmsis } from '@services/pmsi.js';
import { separateMedicalAndParamedicalQR } from 'services/questionnaireResponse.js';
import { indexIsExisting, createIndex, deleteIndex, indexDoctype, indexPatient } from '@tools/elastic.js';
import { getPatientDocsFromElastic, getAllPatientDocsByDocType, searchTermsInPatient, getAutoCompletion } from '@tools/elastic.js';
import { fhirToElastic } from '@timeline/fhirToElastic.js';
import Neo4j from '@tools/neo4j.js';


const documentTypes  = ['pmsis',
    'questionnaireResponses',
    'medicationAdministrations',
    'clinicalReports',
    'labResults',
    'bacteriology'];

/**
 * Create all timelines from elasticsearch data
 * @param {Object} patientData object containing all data about the patient retrieved from ES and separated by type
 * @param {Date} startDate start date for the timelines
 * @param {Date} endDate end date for the timelines
 * @returns {
        labResults : labResultsSeries || [],
        clinicalReports : crSeries || [],
        medicationAdministrations : medAdSeries || [],
        qrMedical : qrMedicalSeries || [],
        qrParamedical : qrParamedicalSeries || [],
        pmsis : pmsisSeries || [],
        oldest: startDate.toISOString(),
        recent: endDate.toISOString(),
    };
 */
function createDocumentsTimelines(patientData, startDate, endDate) {
    const pmsisSeries = aggregateTimelinePmsi(startDate, endDate, patientData.pmsis);
    const separatedQrData = separateMedicalAndParamedicalQR(patientData.questionnaireResponses);
    const qrMedical = separatedQrData[0], qrParamedical = separatedQrData[1];
    const qrMedicalSeries = aggregateTimelineQR(startDate, endDate, qrMedical, 'questionnaires médicaux');
    const qrParamedicalSeries = aggregateTimelineQR(startDate, endDate, qrParamedical, 'questionnaires paramédicaux');
    const medAdSeries = aggregateTimelineMedAd(startDate, endDate, patientData.medicationAdministrations);
    const crSeries = aggregateTimelineCR(startDate, endDate, patientData.clinicalReports);
    const labResultsSeries = aggregateTimelineLabResults(startDate, endDate, patientData.labResults);
    const bacteriologySeries = aggregateTimelineBacteriology(startDate, endDate, patientData.bacteriology);
    if (bacteriologySeries.mainTimeline !== null) {
        labResultsSeries.subTimelines.splice(0, 0, bacteriologySeries.mainTimeline);
    }

    return {
        labResults : labResultsSeries || [],
        clinicalReports : crSeries || [],
        medicationAdministrations : medAdSeries || [],
        qrMedical : qrMedicalSeries || [],
        qrParamedical : qrParamedicalSeries || [],
        pmsis : pmsisSeries || [],
        oldest: startDate.toISOString(),
        recent: endDate.toISOString(),
    };
}

/**
 * Get recommandations from neo4j for a given word and enrich them by counting stuff in ES
 * @param {string} esIndexName ES index to search
 * @param {string} recoTerm term to find recommandations for
 * @param {Date} startDate start date for counts in ES
 * @param {Date} endDate end date for counts in ES
 * @param {number} maxNbReco nb max of recommandations to return
 * @returns same as neo4j.getRecommandations but with leaf nodes getting 2 additional info:
 *              - node.pureSearchMatchesCount : count of results in data when searching only the node concept
 *              - node.combinedSearchMatchCount : count of results in data when searching node concept + recoTerm
 */
async function getRecommandations(esIndexName, recoTerm, startDate, endDate, maxNbReco) {
    const neo4j = new Neo4j(Config.neo4j.uri, Config.neo4j.username, Config.neo4j.password);
    // get recommandations
    const recommandations = await neo4j.getRecommandations(recoTerm, maxNbReco);

    // augment recommandations with search counts.
    for (const [nodeType, nodeValues] of Object.entries(recommandations)) {
        recommandations[nodeType] = await Promise.all(nodeValues.map( async (typedMatch) => {
            for (const [relType, relNodes] of Object.entries(typedMatch.linkedConcepts)) {
                typedMatch.linkedConcepts[relType] = await Promise.all(relNodes.map( async (node) => {
                    if (node.searchTerm === undefined) {
                        node.pureSearchMatchesCount = undefined;
                        node.combinedSearchMatchCount = undefined;
                    } else {
                        let pureOperator, pureTerm, combinedTerm;
                        if (Array.isArray(node.searchTerm)) {
                            pureTerm = node.searchTerm;
                            pureOperator = 'or';
                            combinedTerm = pureTerm.map((t) => [t, recoTerm]);
                        } else {
                            pureTerm = [node.searchTerm];
                            pureOperator = 'and';
                            combinedTerm = [[node.searchTerm, recoTerm]];
                        }
                        // count all apparition of related node in data
                        node.pureSearchMatchesCount = await searchTermsInPatient(esIndexName, pureTerm, pureOperator, 'exact', startDate, endDate, undefined, true);
                        // count combined apparition of current search and related node in data
                        node.combinedSearchMatchCount = Math.max(await Promise.all(combinedTerm.map(async (term) => searchTermsInPatient(esIndexName, term, 'and', 'exact', startDate, endDate, undefined, true))));
                    }
                    return node;
                })).then( (res) => {return res;});
            }
            return typedMatch;
        })).then( (res) => {return res;});
    }

    return recommandations;
}


class patientController {
    constructor(config) {
        this.path = '/';
        this.router = express.Router();

        this.router.use('/fhir', jwtAuthMiddleware({
            identity: config.auth.audIdentity,
            issuer: config.auth.cdsIdentity,
            secret: config.auth.jwtSecret,
            required: true,
        }));
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/fhir/select/:route/:id/:subroute?', this.getSelect);
        this.router.get('/fhir/all/:route/:id', this.getAll);
        this.router.get('/fhir/timeline/:id/', this.getTimeline);
        this.router.get('/fhir/search/:id/', this.search);
        this.router.get('/fhir/autocomplete/:id/', this.autocomplete);
        // this.router.get('/fhir/bandeau/:sbtype/:id/', this.getBandeau);
    }

    /**
     * Bridge to FHIR api for patient and encounters
     * fhir/all/:route/:id calls the FHIR api on :route/:id with route in ['patients','encounters']
     *
     * @param {Request} req inbound request
     * @param {Object} res return handler
     */
    async getAll(req, res) {
        const p = req.params;
        logger.info(`Start fetching all for ${p.route} ${p.id}`);
        const f = new Fhir('http', Config.fhirUrl, '5000');

        const encounters = await f.get('patients', p.id, 'encounters');
        const oldRecentDates = getOldRecentDatesEncounters(encounters);

        f.getAll(p.route, p.id).then((e) => {
            if (e.patients?.patients === 404) {
                logger.info(`not found for ${p.route} ${p.id}`);
                res.status(404).send(e);
            } else {

                Object.assign(e.patients, oldRecentDates);

                logger.info(`${p.route} ${p.id} well sent`);
                res.status(200).send(e);
            }
        }).catch((e) => {
            logger.info(`error: ${e}`);
            res.status(404).send({ error: 'Ressource not found' });
        });
    }

    /**
     * Bridge to FHIR api for specific type of documents
     * /fhir/select/:route/:id/:subroute? calls the FHIR api on :route/:id/:subroute with route in ['patients','encounters']
     * and subroute in [
            'labResults',
            'clinicalReports',
            'medicationAdministrations',
            'procedures',
            'pmsis',
            'questionnaireResponses',
            'bacteriology',
            'encounters',
        ]
     *
     * @param {Request} req inbound request
     * @param {Object} res return handler
     */
    getSelect(req, res) {
        const p = req.params;
        logger.info(`Start fetching select for ${p.route} ${p.id}`);
        const f = new Fhir('http', Config.fhirUrl, '5000');

        f.get(p.route, p.id, p.subroute).then((e) => {
            logger.info(`${e} sent`);
            res.status(200).send(e);
        }).catch((e) => {
            logger.error(`${e} not found`);
            res.status(404).send({ error: 'Ressource not found' });
        });
    }

    /**
     * Search function
     * /fhir/search/:id?start_date=13-01-1966&end_date=20-12-2000&terms=choc%20surveillance&operator=or&mode=exact&docType=labResults&withRecos=false
     *
     * - start_date/end_date : time range for events to return. If not given, all search results are returned
     * - terms: list of terms. Array separated by commas
     * - operator : [and, or] : combination of terms
     * - mode : [exact, approx] : tolerance to typos (up to 2 errors tolerated if "approx")
     * - docType : if given, returns only events from given doc type. In [
            'labResults',
            'clinicalReports',
            'medicationAdministrations',
            'procedures',
            'pmsis',
            'questionnaireResponses',
            'bacteriology',
            'encounters',
        ]
        - withRecos : if true, we generate recommandations for each term using neo4j
     *
     * @param {Request} req inbound request
     * @param {Object} res return handler
     * @returns {
        labResults : labResultsSeries || [],
        clinicalReports : crSeries || [],
        medicationAdministrations : medAdSeries || [],
        qrMedical : qrMedicalSeries || [],
        qrParamedical : qrParamedicalSeries || [],
        pmsis : pmsisSeries || [],
        oldest: startDate.toISOString(),
        recent: endDate.toISOString(),
        recommandations: {term1: recos, ...} where recos has the format of getRecommandations
    };
     */
    async search(req, res) {
        const terms = req?.query?.terms;
        if (!terms) {return res.status(400).send({error : 'terms must be provided'});}

        // get and check parameters
        const operator = req?.query?.operator || 'and';
        if (!(['and', 'or'].includes(operator)) ){return res.status(400).send({error : 'operator must be "and" or "or"'});}

        const mode = req?.query?.mode || 'exact';
        if (!(['exact', 'approx'].includes(mode)) ){return res.status(400).send({error : 'mode must be "exact" or "approx"'});}

        let startDate, endDate;
        if (req?.query?.start_date) {
            try {
                startDate = moment(req?.query?.start_date, 'DD-MM-YYYY').toDate();
            } catch (err) {
                return res.status(400).send({error : `start_date expected format : DD-MM-YYYY (got ${req?.query?.start_date}`});
            }
        }
        if (req?.query?.end_date) {
            try {
                endDate = moment(req?.query?.end_date, 'DD-MM-YYYY').toDate();
            } catch (err) {
                return res.status(400).send({error : `end_date expected format : DD-MM-YYYY (got ${req?.query?.end_date}`});
            }
        }

        const docType = req?.query?.doc_type;
        if (docType && (!documentTypes.includes(docType))) {return res.status(400).send({error : `if doctype is provided, doc_type must be in ${documentTypes}`});}

        const withRecos = Boolean(req?.query?.with_recos) || false;

        // check if data exists
        const p = req.params;
        const esIndexName = `patient_${p.id}`;
        const esIndexExists = await indexIsExisting(esIndexName);
        if (!esIndexExists) {return res.status(400).send({error : `${esIndexName} has not yet been loaded`});}

        if (startDate === undefined || endDate === undefined) {
            const encounters = await getAllPatientDocsByDocType(esIndexName, 'encounter');
            const minEncounterStart = new Date(Math.min.apply(null, encounters.map(e => new Date(e.start))));
            const maxEncounterEnd = new Date(Math.max.apply(null, encounters.map(e => new Date(e.end))));

            if (startDate === undefined || startDate < minEncounterStart) {
                startDate = minEncounterStart;
            }
            if (endDate === undefined || endDate > maxEncounterEnd) {
                endDate = maxEncounterEnd;
            }
        }

        // make search
        console.log(`Search of the term : ${terms} with operator : ${operator}, mode ${mode} and doc_type ${docType} between ${startDate} and ${endDate}, with recos: ${withRecos}`);
        const separatedTerms = _.filter(terms.split(','), function(t) { return t !== ''; });
        const results = await searchTermsInPatient(esIndexName, separatedTerms, operator, mode, startDate, endDate, docType);
        if (results === null) {return res.status(500).send({error : 'Internal error in research'});}
        const nbResults = Object.values(results).reduce((acc, curr) => {return acc + curr.length;}, 0);
        console.log(`... found ${nbResults} results`);

        // create timelines
        const formattedResults = createDocumentsTimelines(results, startDate, endDate);

        if (withRecos) {
            // generic search => get recommandations
            formattedResults.recommandations = {};
            const recos = await Promise.all(separatedTerms.map( async (term ) => {
                return getRecommandations(esIndexName, term, startDate, endDate);
            }));
            separatedTerms.forEach( (term, index) => {formattedResults.recommandations[term] = recos[index];});
        }
        res.status(200).send(formattedResults);
    }

    /**
     * Autocomplete endpoint
     *
     * http://localhost:8080/fhir/autocomplete/2/?term=surveil returns a list of terms autocompleting "surveil" from the data in ES
     *
     * @param {Request} req inbound request
     * @param {Object} res return handler
     * @returns string[]
     */
    async autocomplete(req, res) {
        // return autocomplete suggestions by most freq order
        const term = req?.query?.term;
        if (!term) {return res.status(400).send({error : 'term must be provided'});}

        const p = req.params;
        const esIndexName = `patient_${p.id}`;
        const results = await getAutoCompletion(esIndexName, term);
        res.status(200).send({term: term, results: results});
    }

    /**
     * Endpoint to get timelines. If the data has never been retrieved, we get them from the FHIR api and index it in ES (in the index patient_${p.id})
     * From then on, all data for the patient is always retrieved from ES
     *
     * /fhir/timeline/:id?start_date=13-01-1966&end_date=20-12-2000
     *
     * - start_date/end_date : time range for events to return. If not given, all search results are returned
     *
     * @param {Request} req inbound request
     * @param {Object} res return handler
     * @returns {
        infoPatient = infoPatient || [];
        hospitalisations = hospitalisation || [];
        consultations = consultation || [];
        labResults : labResultsSeries || [],
        clinicalReports : crSeries || [],
        medicationAdministrations : medAdSeries || [],
        qrMedical : qrMedicalSeries || [],
        qrParamedical : qrParamedicalSeries || [],
        pmsis : pmsisSeries || [],
        oldest: startDate.toISOString(),
        recent: endDate.toISOString()
    };
     */
    async getTimeline(req, res) {
        const p = req.params;
        logger.info('Fetching patient for timeline ');
        const f = new Fhir('http', Config.fhirUrl, '5000');

        const esIndexName = `patient_${p.id}`;
        const esIndexExists = await indexIsExisting(esIndexName);

        if (!esIndexExists) {
            // get data from FHIR, fill elasticsearch
            try {
                if (!(await createIndex(esIndexName))) {
                    throw new Error('Could not create index (see logs)');
                }

                const encountersFhir = await f.get('patients', p.id, 'encounters');
                const patientFhirData = await f.getAll(null, p.id);
                if (patientFhirData.patients?.patients === 404) {
                    logger.info(`not found for ${p.route} ${p.id}`);
                    throw new Error(`FHIRClient - No data found for patient ${p.id}`);
                }


                logger.info('Saving data on Elastic Search : processing...');
                // index patient data
                await indexDoctype(esIndexName, fhirToElastic(patientFhirData.patients.patients, 'patient'), 'patient');

                // index encounters
                const encountersIdInPmsi = getEncountersInPmsis(patientFhirData.patients?.pmsis);
                let encountersForES = encountersFhir.map(d => fhirToElastic(d, 'encounter', encountersIdInPmsi));
                if (encountersForES.length && Array.isArray(encountersForES[0])) {
                    encountersForES = encountersForES.reduce((acc, curr) => {
                        acc = acc.concat(curr);
                        return acc;
                    }, []);
                }
                await indexDoctype(esIndexName, encountersForES, 'encounter');

                // index everything else
                logger.info('Saving patient data on Elastic Search : processing...');
                const patientForES = {};
                documentTypes.forEach(docType => {
                    let valuesForES = patientFhirData.patients[docType].map(d => fhirToElastic(d, docType));
                    if (valuesForES.length && Array.isArray(valuesForES[0])) {
                        valuesForES = valuesForES.reduce((acc, curr) => {
                            acc = acc.concat(curr);
                            return acc;
                        }, []);
                    }
                    patientForES[docType] = valuesForES;
                });
                await indexPatient(esIndexName, patientForES);
                logger.info('Saving patient data on Elastic Search : done');
            } catch (err) {
                // catch error, clean ES if necessary
                console.log(`Error collecting data for patient ${p.id} : ${err}`);
                let frontErrMessage;
                if (err.message.includes('FHIRClient')) {
                    frontErrMessage = 'Error loading patient data from FHIR api, please check service logs.';
                } else if (err.message.includes('ELASTICSEARCH')) {
                    frontErrMessage = 'Error loading patient data to ElasticSearch, please check service logs.';
                } else {
                    frontErrMessage = err.message;
                }
                if (!(await deleteIndex(esIndexName))) {
                    frontErrMessage += ' Error cleaning after error, the service may not function properly for the current patient.';
                    console.log(`Error cleaning ES index ${esIndexName}, please clean it manually`);
                }
                res.status(500).send({status: 'error', message: frontErrMessage});
                return;
            }
        }

        try {
            // get data from ES
            let startDate, endDate;
            if (req?.query?.start_date) {
                startDate = moment(req?.query?.start_date, 'DD-MM-YYYY').toDate();
            }
            if (req?.query?.end_date) {
                endDate = moment(req?.query?.end_date, 'DD-MM-YYYY').toDate();
            }

            const patient = await getAllPatientDocsByDocType(esIndexName, 'patient');
            const encounters = await getAllPatientDocsByDocType(esIndexName, 'encounter');
            const patientDocs = await getPatientDocsFromElastic(esIndexName, startDate, endDate);

            // process data to create timelines
            if (Object.values(patientDocs).map(v => v.length).reduce( (acc, v) => acc + v, 0) === 0) {
                throw new Error('ELASTICSEARCH No data retrieved');
            }
            const minEncounterStart = new Date(Math.min.apply(null, encounters.map(e => new Date(e.start))));
            const maxEncounterEnd = new Date(Math.max.apply(null, encounters.map(e => new Date(e.end))));

            if (startDate === undefined || startDate < minEncounterStart) {
                startDate = minEncounterStart;
            }
            if (endDate === undefined || endDate > maxEncounterEnd) {
                endDate = maxEncounterEnd;
            }

            const infoPatient = patient.length ? patient[0] : undefined;

            const encountersSeries = aggregateEncounters(startDate, endDate, encounters);

            const aggregatedResults = createDocumentsTimelines(patientDocs, startDate, endDate);
            aggregatedResults.infoPatient = infoPatient || [];
            aggregatedResults.hospitalisations = encountersSeries.hospitalisation || [];
            aggregatedResults.consultations = encountersSeries.consultation || [];

            res.status(200).send(aggregatedResults);
            logger.info(`Result sent for start_date : ${startDate} & end_date : ${endDate}` );

        } catch (err) {
            logger.info(err);
            if (err.message.includes('ELASTICSEARCH')) {
                let frontErrMessage = 'Error loading patient data from Elasticsearch.';
                if (!(await deleteIndex(esIndexName))) {
                    frontErrMessage += ' Error cleaning after error, the service may not function properly for the current patient.';
                    console.log(`Error cleaning ES index ${esIndexName}, please clean it manually`);
                } else {
                    frontErrMessage += 'Please retry.';
                }
                res.status(500).send({status: 'error', message: frontErrMessage});
                return;
            } else {
                res.status(500).send({status: 'error', message: err.message});
                return;
            }
        }
    } catch (err) {
        logger.info(err);
    }
}


export { patientController };
