const { json } = require('body-parser');
const neo4j = require('neo4j-driver');

/** @typedef {{identity: {low: number, high: number}, labels: string[], properties: Object<string, string>}} Neo4jNode */


const nodeTypes = [
    'Maladie',
    'Symptome',
    'Examen',
    'Specialite',
    'Medicament',
    'Classe_therapeutique',
    'Nom_commercial',
    'Ingredient',
];


module.exports = class Neo4j {
    /**
	 * Creates a Neo4j API wrapper
	 *
	 * @param {string} uri URI of the neo4j server, e.g. neo4j+s://host:7687 or
	 * bolt://host:7687
	 * @param {string} user Neo4j user name
	 * @param {string} password Neo4j user password
	 * @returns {Neo4j} An instance of the class
	 */
    constructor(uri, user, password) {
        /** @private */
        this._driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

        this.release = this.release.bind(this);
        this.query = this.query.bind(this);
        this._buildQuery = this._buildQuery.bind(this);

        /**
		 * Queries the database for nodes of given type
		 * for which any key contains  the search term
		 * parameters
		 *
		 * @param {string} nodeType type of node (in nodeTypes)
         * @param {string} searchTerm term to search
		 * @returns {{m: Neo4jNode}[]} An array of {m: nodeType} records
		 */
        this.searchMatchingTypeQuery = (nodeType, searchTerm) => this._buildQuery(
            `MATCH (m:${nodeType})  ` +
            'WHERE any(key in keys(m) WHERE TOUPPER(m[key]) CONTAINS TOUPPER($search_term)) ' +
            'RETURN m')(searchTerm);

        /**
		 * Queries the database for all types of node
		 * for which any key contains  the search term
		 * parameters
		 *
		 * @param {string} nodeType type of node (in nodeTypes)
         * @param {string} searchTerm term to search
		 * @returns {nodeType: Neo4jNode[]} A dict of nodeType Array records indexed by nodeType
		 */
        this.searchMatches = async (searchTerm) => {
            return Promise.all(nodeTypes.map( (nodeType) => this.searchMatchingTypeQuery(nodeType, searchTerm)))
                .then(res => {
                    // console.log(res);
                    const matches = {};
                    nodeTypes.forEach( (nodeType, index) => {
                        if (res[index].length) { matches[nodeType] = res[index].map((v) => v.m);}
                    });
                    // console.log(matches);
                    return matches;
                });
        };

        /**
		 * Queries the database for all nodes related to the given node
         *
		 * @param {neo4jIdentity} neo4jIdentity Identity of node to match
		 * @returns {n: Neo4jNode, r: Neo4jRel, m: Neo4jNode}[] an array of related nodes where n is the one matching the given Id
		 */
        this.getRelatedConceptsQuery = this._buildQuery('MATCH (n)-[r]-(m) WHERE ID(n) = $id RETURN n, r, m');

        /**
		 * Extracts the relevant properties from a given relationship (n, r, m)
         *
		 * @param {n: Neo4jNode, r: Neo4jRel, m: Neo4jNode} relationship relationship to process
		 * @returns {
                label: label of m,
                type: nodeType of m,
                searchTerm: term representing m to search in ElasticSearch,
                weight: weight of r (1 if unknown),
            }
		 */
        this.extractRelationshipData = (relationship) => {
            let searchTerm;
            // eslint-disable-next-line default-case
            switch (relationship.m.labels[0]) {
            case 'Maladie':
                searchTerm = relationship.m.properties.pmsi || relationship.m.properties.label;
                break;
            case 'Symptome':
                searchTerm = relationship.m.properties.cui || relationship.m.properties.label;
                break;
            case 'Examen':
                searchTerm = relationship.m.properties.concept_cd_dxcarenum || relationship.m.properties.label;
                break;
            case 'Specialite':
                searchTerm = relationship.m.properties.label;
                break;
            case 'Medicament':
                searchTerm = relationship.m.properties.label;
                break;
            case 'Classe_therapeutique':
                searchTerm = relationship.m.properties.label;
                break;
            case 'Nom_commercial':
                searchTerm = relationship.m.properties.label;
                break;
            case 'Ingredient':
                searchTerm = relationship.m.properties.label;
                break;
            }
            return {
                label: relationship.m.properties.label,
                type: relationship.m.labels[0],
                searchTerm: searchTerm,
                weight: relationship.r.properties?.weight || 1,
            };
        };

        /**
		 * Queries the database and processes all nodes related to the given node.
         *
		 * @param {neo4jIdentity} neo4jIdentity Identity of node to match
		 * @returns {relType: RelRepr[]}[] A dict of RelRepr Array records indexed by relationship name,
         * where RelRepr is the output of this.extractRelationshipData.
         * RelRepr are sorted by decreasing weight
		 */
        this.getRelatedConcepts = async (neo4jIdentity) => {
            return await this.getRelatedConceptsQuery(neo4jIdentity)
                .then( (res) => {
                    const concepts = {};
                    res.forEach( (concept) => {
                        if (concept.m.properties.label) {   // filter results with no label
                            if (!(concept.r.type in concepts)) { concepts[concept.r.type] = []; }
                            concepts[concept.r.type].push(this.extractRelationshipData(concept));
                        }
                    });
                    // console.log(concepts);
                    Object.keys(concepts).forEach( relType => {
                        concepts[relType] = concepts[relType].sort( (a, b) => b.weight - a.weight);
                    });

                    return concepts;
                });
        };

        /**
		 * Queries the database to find all nodes that could match searchterm
         * Then queries the database and processes all the relationships found for each previous match
         * Matches are sorted by nb of related nodes
         *
		 * @param {string} searchTerm search term
         * @param {int} maxItem if given, nb of matches are cut to maxItem, and nb of relationships/match are also cut to maxItem
		 * @returns {nodeType: {label: node name,
         *                      linkedConcepts: {relType: RelRepr[]}
         *                      }[] } A dict of matches and their related nodes indexed by nodeType
         * where {relType: RelRepr[]} is the output of this.getRelatedConcepts
		 */
        this.getRecommandations = async (searchTerm, maxItem) => {
            return await this.searchMatches(searchTerm)
                .then( async (matches) => {
                    const results = {};
                    for (const [nodeType, nodes] of Object.entries(matches)) {
                        const allTypeResults = await Promise.all(nodes.map((node) => this.getRelatedConcepts(node.identity)));
                        nodes.forEach( (node, index ) => {
                            if (Object.keys(allTypeResults[index]).length && node.properties.label) {  // filter results with no label
                                if (!(nodeType in results)) { results[nodeType] = {};}
                                results[nodeType][node.properties.label] = allTypeResults[index];
                            }
                            if (node.properties?.synonyms && node.properties.synonyms !== 'n/a') {
                                node.properties.synonyms = node.properties.synonyms.split(';').map((t) => {return { label: t, searchTerm: t};});
                                if (!(nodeType in results)) { results[nodeType] = {};}
                                if (!(node.properties.label in results[nodeType])) {
                                    results[nodeType][node.properties.label] = {};
                                }
                                results[nodeType][node.properties.label].SYNONYMS = node.properties.synonyms;
                            }
                            if (node.properties?.abbreviations && node.properties.abbreviations !== 'n/a') {
                                node.properties.abbreviations = node.properties.abbreviations.split(';').map((t) => {return { label: t, searchTerm: t};});
                                if (!(nodeType in results)) { results[nodeType] = {};}
                                if (!(node.properties.label in results[nodeType])) {
                                    results[nodeType][node.properties.label] = {};
                                }
                                results[nodeType][node.properties.label].ABBREVIATIONS = node.properties.abbreviations;
                            }
                            //results[nodeType][node.properties.label] = results[nodeType][node.properties.label].sort()
                        });

                        // sort
                        if (nodeType in results) {
                            results[nodeType] = Object.keys(results[nodeType]).sort( (a, b) => {
                                const countResults = (node) => {
                                    return Object.values(node).map( (v) => Object.keys(v).length).reduce((accb, eltb) => accb + eltb, 0);
                                };
                                return countResults(results[nodeType][b]) - countResults(results[nodeType][a]);
                            }).reduce( (obj, key) => {
                                obj = obj.concat([{label: key, linkedConcepts: results[nodeType][key]}]);
                                return obj;
                            }, []);

                            if (maxItem) {
                                results[nodeType] = results[nodeType].slice(0, maxItem).map( (match) => {
                                    Object.keys(match.linkedConcepts).forEach( (rel) => {
                                        match.linkedConcepts[rel] = match.linkedConcepts[rel].splice(0, maxItem);
                                    });
                                    return match;
                                });
                            }
                        }
                    }
                    return results;
                });
        };


    }

    /**
	 * Closes network connections and releases held ressources.
	 * The instance should then be discarded. Accessing any property or method
	 * after release() has been called - including calling release() multiple
	 * times - is undefined behavior.
	 */
    async release() {
        await this._driver.close();
        this._driver = null;
    }

    /**
	 * Runs a query against the database and returns the results
	 *
	 * @param {string} qstr Cypher query string
	 * @param {Object} params Parameters of the query, as a mapping of the
	 * parameter's name (as defined with $name in the query string) to its value
	 * @returns {Object[]} An array of Neo4j Record objects. Use .get(KEY) with
	 * KEY the name from the RETURN statement of the query to get the
	 * corresponding object
	 */
    query(qstr) {
        return async params => {
            const session = this._driver.session();

            let result;

            try {
                result = await session.run(qstr, params);
            } catch (e) {
                console.error(e);
                return null;
            } finally {
                session.close();
            }

            return result.records;
        };
    }

    /**
	 * Builds a function from a query string that accepts positional parameters
	 * and returns the results as an array of POJOs
	 *
	 * @private
	 * @param {string} q The query string
	 * @param {...string} p Names of the query parameters in the order they
	 * should be passed to the resulting function. If not specified, parameters
	 * are determined from the query string
	 * @returns {function(...(*)): Object<string, Neo4jNode>[]} A function that
	 * takes the parameters of the query in the order specified by p or, if p was
	 * not specified, in the order they appear in the query string; runs the query
	 * against the database, and returns the result as an array of records keyed
	 * by the name of each item from the RETURN statement of the query
	 */
    _buildQuery(q, ...p) {
        return ((q, p) => async (...a) => (await q(p(a))).map(b => b.keys.reduce((a, k) => ({...a, [k]: b.get(k)}), {})))(
            this.query(q), (a => b => a.reduce((a, k, i) => k in a ? a : ({ ...a, [k]: b[i] }), {}))(p.length > 0 ? p : [...q.matchAll(/\$([A-Z0-9_]+)/ig)].map(a => a[1])));
    }
};
