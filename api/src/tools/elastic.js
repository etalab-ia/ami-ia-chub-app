import moment from 'moment';
import Config from 'config';

const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: Config.elasticUrl });

import {
    getElasticMapping,
    readElasticResults,
} from '@timeline/fhirToElastic.js';


const documentTypes  = ['pmsis',
    'questionnaireResponses',
    'medicationAdministrations',
    'clinicalReports',
    'labResults',
    'bacteriology'];

/**
 * Create Index. Returns true if index created, false otherwise
 *
 * @param {string} esIndex index to search in
 * @returns {boolean}
 */
const createIndex = async (indexName) =>{
    return await client.indices.create({
        index: indexName,
        body: getElasticMapping(),
    }).catch((err) => {
        console.log(`ELASTICSEARCH createIndex() can't do its work, see error below : ${err}`);
        return err;
    }).then((body) => {
        console.log(body);
        if (body.statusCode === 200) {return true;}
        return false;
    });
};


/**
 * Delete Index. Returns true if index deleted, false otherwise
 *
 * @param {string} esIndex index to delete
 * @returns {boolean}
 */
const deleteIndex = async (indexName) =>{
    return await client.indices.delete({
        index: indexName,
    }).catch((err) => {
        console.log(`ELASTICSEARCH deleteIndex() can't do its work, see error below : ${err}`);
        return err;
    }).then((body) => {
        console.log(body);
        if (body.statusCode === 200) {return true;}
        return false;
    });
};

/**
 * returns true if index exists, false otherwise
 *
 * @param {string} esIndex index to search in
 * @returns {boolean}
 */
const indexIsExisting = async (indexName) => {
    return await client.indices.exists({
        index: indexName,
    }).catch((err) => {
        console.log(`ELASTICSEARCH indexIsExisting() can't do its work, see error below : ${err}`);
        return false;
    }).then( (body) => {
        return body.body;
    });
};

/**
 * index all documents in the index
 *
 * @param {string} esIndex index to search in
 * @param {Documents[]} patientData data to index where Documents are documents to index (see fhirToElastic)
 * @param {string} docType type of the data
 * @returns {boolean} true if ok
 */
const indexDoctype = async (esIndex, data, docType) => {

    let body = [];
    data.forEach((doc, idx) => {
        doc.id = `${docType}-${idx}`;
        body = body.concat([{ index: { _index: esIndex }}, doc]);
    });
    const { body: bulkResponse } = await client.bulk({ refresh: true, body });
    bulkResponse.docType = docType;
    console.log(bulkResponse);

    if (bulkResponse.errors) {
        const erroredDocuments = [];
        // The items array has the same order of the dataset we just indexed.
        // The presence of the `error` key indicates that the operation
        // that we did for the document has failed.
        bulkResponse.items.forEach((action, i) => {
            const operation = Object.keys(action)[0];
            if (action[operation].error) {
                erroredDocuments.push({
                    // If the status is 429 it means that you can retry the document,
                    // otherwise it's very likely a mapping error, and you should
                    // fix the document before to try it again.
                    status: action[operation].status,
                    error: action[operation].error,
                    operation: body[i * 2],
                    document: body[i * 2 + 1],
                });
            }
        });
        console.log(erroredDocuments);
        return false;
    }

    // Not useful since we insert in //
    // const { body: count } = await client.count({ index: esIndex });
    // console.log(`${docType} - ${count.count} (+${data.length})`);
    return true;
};

/**
 * index all data in the index
 *
 * @param {string} esIndex index to search in
 * @param {docType: Documents[]} patientData data to index where Documents are documents to index (see fhirToElastic)
 * @returns {boolean} true
 */
const indexPatient =  async (esIndex, patientData) => {
    // index all documents by type
    return await Promise.all(documentTypes.map( async (docType) => {
        return indexDoctype(esIndex, patientData[docType], docType)
            .catch( (err) => {
                console.log(`ELASTICSEARCH indexingPatient() can't do its work, see error below : ${err}`);
            }).then( (res) => {
                if (!res) {throw new Error(`Error indexing ${docType} in index ${esIndex} (see logs)`);}
                return res;
            });
    })).catch( (err) => {
        console.log(err);
    }).then( async (res) => {
        const { body: count } = await client.count({ index: esIndex });
        console.log(`Inserted a total of ${count.count} documents`);
        return true;
    });
};

/**
 * get matches for query in index
 *
 * @param {string} esIndex index to search in
 * @param {Dict} query ES query
 * @param {number} minScore if given, only matches with score >= minScore
 * @returns {EsHit[]} all hits from the search
 */
const makeScrolledResearch = async (esIndex, query, minScore) => {
    // make research and scroll through all results
    const allRecords = [];

    // first we do a search, and specify a scroll timeout
    const search = {
        index: esIndex,
        scroll: '10s',
        size: 1000,
        body: {
            query: query,
        },
    };
    if (minScore) {
        search.body.min_score = minScore;
    }
    await client.search(search)
        .then(async (res) => {
            let _scroll_id = res.body._scroll_id;
            let hits = res.body.hits;
            while (hits && hits.hits.length) {
            // Append all new hits
                allRecords.push(...hits.hits);
                console.log(`${allRecords.length} of ${hits.total}`);

                await client.scroll({
                    scrollId: _scroll_id,
                    scroll: '10s',
                }).then( (res) => {
                    _scroll_id = res.body._scroll_id;
                    hits = res.body.hits;
                });
            }
        });

    console.log(`Complete: ${allRecords.length} records retrieved`);
    return allRecords;
};

/**
 * counts matches for query in index
 *
 * @param {string} esIndex index to search in
 * @param {Dict} query ES query
 * @param {number} minScore if given, only matches with score >= minScore
 * @returns {number} nb of matches
 */
const makeCountResearch = async (esIndex, query, minScore) => {
    const search = {
        index: esIndex,
        body: {
            query: query,
        },
    };
    if (minScore) {
        search.min_score = minScore;
    }
    return await client.count(search)
        .catch( (err) => {
            console.log(err);
            throw err;
        }).then((res) => {
            console.log(res);
            return res.body.count;
        });
};


/**
 * get all documents in index between start date and end date
 *
 * @param {string} esIndex index to search in
 * @param {Date} startDate start date for search
 * @param {Date} endDate end date for search
 * @returns {...} output of readElasticResults
 */
const getPatientDocsFromElastic = async (esIndex, startDate, endDate) => {
    // get all documents from patients (or between startDate and endDate)
    let query = {'match_all': {}};
    if ((startDate !== undefined) || (endDate !== undefined)) {
        query = {'range': {'documentStartDate': {}}};
        if (startDate) {
            query.range.documentStartDate.gte = moment(startDate).format('YYYY-MM-DD');
        }
        if (endDate) {
            query.range.documentStartDate.lte = moment(endDate).format('YYYY-MM-DD');
        }
    }
    return await makeScrolledResearch(esIndex, query)
        .catch( (err) => {
            console.log(err);})
        .then( (esDocs) => {
            const patient = {};
            documentTypes.forEach( v => {patient[v] = [];});
            return readElasticResults(esDocs, patient);
        });
};

/**
 * get all encounters in index
 *
 * @param {string} esIndex index to search in
 * @returns {...} output of readElasticResults
 */
const getAllPatientDocsByDocType = async (esIndex, docType) => {
    // get all documents from patients (or between startDate and endDate)
    const query = {
        bool: {
            filter: [
                {
                    match : {
                        documentType: {
                            query: docType,
                        },
                    },
                },
            ],
        },
    };
    return await makeScrolledResearch(esIndex, query)
        .catch( (err) => {
            console.log(err);})
        .then( (esDocs) => {
            return readElasticResults(esDocs, {})[docType];
        });
};


/**
 * Searches matches in ES
 *
 * @param {string} esIndex index to search in
 * @param {string[]} terms search terms
 * @param {string} operator or | and
 * @param {string} mode exact | approx
 * @param {Date} startDate start date for search
 * @param {Date} endDate end date for search
 * @param {boolean} countOnly if true : only returns the nb of matches, not the matches (int)
 * @returns {...} output of readElasticResults
 */
const searchTermsInPatient = async (esIndex, terms, operator, mode, startDate, endDate, documentType, countOnly) => {
    let query;
    let minScore;
    const esOperator = (terms.length === 1 || operator.toUpperCase() === 'AND') ? 'must' : 'should';

    if (mode === 'exact'){
        //Matching strict
        query = {
            bool: {
                [esOperator]: terms.map( (term) => {return {
                    match_phrase : {
                        abstract: {
                            query: term,
                        },
                    },
                };}),
                must_not: {
                    term : {
                        documentType: 'encounter',
                    },
                },
            },
        };
    } else {
        minScore = operator.toUpperCase() === 'AND' ?
            terms.map( (val, index) => 10 ** (index + 2)).reduce( (acc, s) => acc + s, 0) :
            100;
        query = {
            bool: {
                must_not: {
                    term : {
                        documentType: 'encounter',
                    },
                },
                [esOperator]: terms.map( (term, index) => {
                    return {
                        bool: {
                            should: [
                                {
                                    constant_score: {
                                        filter: {
                                            'span_near': {
                                                'clauses': term.toLowerCase().split(' ').map( t => {
                                                    return {
                                                        'span_multi': {
                                                            'match': {
                                                                'fuzzy': {
                                                                    'abstract': {
                                                                        'fuzziness': 2,
                                                                        'value': t,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    };
                                                }),
                                                'slop': 1,
                                                'in_order': 'true',
                                            },
                                        },
                                        boost: 10 ** (index + 2),
                                    },
                                },
                                {
                                    constant_score: {
                                        filter: {
                                            'span_near': {
                                                'clauses': term.toLowerCase().split(' ').map( t => {
                                                    return {
                                                        'span_multi': {
                                                            'match': {
                                                                'fuzzy': {
                                                                    'abstract': {
                                                                        'fuzziness': 1,
                                                                        'value': t,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    };
                                                }),
                                                'slop': 1,
                                                'in_order': 'true',
                                            },
                                        },
                                        boost: 1,
                                    },
                                },
                                {
                                    constant_score: {
                                        filter: {
                                            'span_near': {
                                                'clauses': term.toLowerCase().split(' ').map( t => {
                                                    return {
                                                        'span_term': {
                                                            'abstract': t,
                                                        },
                                                    };
                                                }),
                                                'slop': 1,
                                                'in_order': 'true',
                                            },
                                        },
                                        boost: 1,
                                    },
                                },
                            ],
                        },
                    };
                }),
            },
        };
    }

    // add date filters
    if ((startDate !== undefined) || (endDate !== undefined)) {
        const range = {'documentStartDate': {}};
        if (startDate) {
            range.documentStartDate.gte = moment(startDate).format('YYYY-MM-DD');
        }
        if (endDate) {
            range.documentStartDate.lte = moment(endDate).format('YYYY-MM-DD');
        }
        if (mode === 'exact') {
            query.bool.filter = {range: range};
        } else {
            query.bool = {filter: [{range: range}], [esOperator]: query.bool[esOperator]};
        }
    }

    // add documentType filter
    if (documentType !== undefined) {
        const docType = {
            match : {
                documentType: {
                    query: documentType,
                },
            },
        };
        if ('filter' in query.bool) {
            if (Array.isArray(query.bool.filter))
            {query.bool.filter.push(docType);}
            else
            {query.bool.filter = [query.bool.filter, docType];}
        } else {
            // case fuzzy no date
            query.bool = {filter: docType, [esOperator]: query.bool[esOperator]};
        }
    }

    if (countOnly) {
        return await makeCountResearch(esIndex, query, minScore);
    } else {
        try {
            return await makeScrolledResearch(esIndex, query, minScore)
                .catch( (err) => {
                    console.log(err);
                    throw new Error(`ELASTICSEARCH error: ${err}`);
                }).then( (esDocs) => {
                    const patient = {};
                    documentTypes.forEach( v => {patient[v] = [];});
                    return readElasticResults(esDocs ? esDocs : [] , patient);
                });
        } catch (err) {
            console.log(`ELASTICSEARCH error searching term : ${terms}, see error below : ${err}`);
            return null;
        }
    }
};


/**
 * Searches autocompletions in ES
 *
 * @param {string} esIndex index to search in
 * @param {string} term term to autocomplete
 * @returns { string[] } list of suggestions sorted by most probable
 */
const getAutoCompletion = async (esIndex, term) => {
    // get autocompletion suggestions
    const query = {
        'suggest': {
            'search-suggest': {
                'prefix': term.toLowerCase(),
                'completion': {
                    'field': 'suggest',
                    'size': 50,
                },
            },
        },
    };

    const allSuggestions = [];

    // first we do a search, and specify a scroll timeout
    const search = {
        index: esIndex,
        body: query,
    };
    return await client.search(search)
        .catch(err => {
            console.log(err);
            throw err;
        })
        .then(async (res) => {
            res.body.suggest['search-suggest'][0].options.forEach((opt) => {
                opt._source.suggest.forEach(sugg => {
                    if (sugg.indexOf(term.toLowerCase()) === 0) {allSuggestions.push(sugg);}
                });
            });
            const counted = allSuggestions.reduce( (acc, curr) => {
                if (!(curr in acc)) {acc[curr] = 0;}
                acc[curr] += 1;
                return acc;
            }, {});
            const sorted = Object.keys(counted).sort((a, b) => {return counted[b] - counted[a];});
            return sorted;
        });
};



module.exports = {
    indexIsExisting,
    createIndex,
    deleteIndex,
    indexDoctype,
    indexPatient,
    getPatientDocsFromElastic,
    getAllPatientDocsByDocType,
    searchTermsInPatient,
    getAutoCompletion,
};
