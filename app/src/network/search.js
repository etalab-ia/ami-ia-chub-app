import moment from 'moment';
import {SearchQueryCombination, SearchQueryMatching} from '../store/defs';
import network from './index';

export const search = (authToken, patientId, startDate, endDate, terms, matching, combination, docType = undefined, withoutSuggestions = false) => network(authToken).get(`/fhir/search/${patientId}`, {
	start_date: startDate ? moment(startDate).format('DD-MM-YYYY') : null,
	end_date: endDate ? moment(endDate).format('DD-MM-YYYY') : null,
	terms,
	mode: {[SearchQueryMatching.EQUAL]: 'exact', [SearchQueryMatching.LIKE]: 'approx'}[matching],
	operator: {[SearchQueryCombination.AND]: 'and', [SearchQueryCombination.OR]: 'or'}[combination],
	doc_type: docType,
	with_recos: withoutSuggestions ? undefined : true
});

export const autocomplete = (authToken, patientId, term) => network(authToken).get(`/fhir/autocomplete/${patientId}`, {term});
