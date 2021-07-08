import {autocomplete, search} from '../../network/search';
import {userSessionExpired} from './sessionActions';

export const CLEAR_SEARCH_RESULTS = 'CLEAR_SEARCH_RESULTS';
export const CLEAR_SUGGESTIONS = 'CLEAR_SUGGESTIONS';
export const DELETE_SAVED_QUERY = 'DELETE_SAVED_QUERY';
export const LOAD_QUERY = 'LOAD_QUERY';
export const LOAD_QUERY_FROM_HISTORY = 'LOAD_QUERY_FROM_HISTORY';
export const SAVE_QUERY = 'SAVE_QUERY';
export const SAVE_QUERY_TO_HISTORY = 'SAVE_QUERY_TO_HISTORY';
export const SET_QUERY = 'SET_QUERY';
export const SET_QUERY_COMBINATION = 'SET_QUERY_COMBINATION';
export const SET_QUERY_MATCHING = 'SET_QUERY_MATCHING';
export const SET_QUERY_TERMS = 'SET_QUERY_TERMS';
export const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';
export const SET_AUTOCOMPLETE_SUGGESTIONS = 'SET_AUTOCOMPLETE_SUGGESTIONS';

export const setQuery = (terms, matching, combination) => ({type: SET_QUERY, payload: {terms, matching, combination}});
export const setQueryTerms = terms => ({type: SET_QUERY_TERMS, payload: terms});
export const setQueryMatching = matching => ({type: SET_QUERY_MATCHING, payload: matching});
export const setQueryCombination = combination => ({type: SET_QUERY_COMBINATION, payload: combination});
export const saveQuery = name => ({type: SAVE_QUERY, payload: name});
export const deleteSavedQuery = position => ({type: DELETE_SAVED_QUERY, payload: position});
export const loadQuery = position => ({type: LOAD_QUERY, payload: position});
export const setSearchResults = (results, query) => ({type: SET_SEARCH_RESULTS, payload: {results, query}});
export const clearSearchResults = () => ({type: CLEAR_SEARCH_RESULTS});
export const clearSuggestions = () => ({type: CLEAR_SUGGESTIONS});
export const setAutocompleteSuggestions = suggestions => ({type: SET_AUTOCOMPLETE_SUGGESTIONS, payload: suggestions});
export const loadQueryFromHistory = index => ({type: LOAD_QUERY_FROM_HISTORY, payload: index});
export const saveQueryToHistory = query => ({type: SAVE_QUERY_TO_HISTORY, payload: query});

export const runSearch = (patientId, startDate, endDate, errorCallback = null) => async (dispatch, getState) => {
	const state = getState();

	dispatch(saveQueryToHistory(state.search.query));

	let results;
	try {
		results = await search(state.session.authToken, patientId, startDate, endDate, state.search.query.terms.split(',').map(a => a.trim()).join(','),
			state.search.query.matching, state.search.query.combination, undefined, state.search.suggestions !== null);
	} catch(e) {
		if (e.name === 'HttpError' && e.code === 401)
			return dispatch(userSessionExpired());

		console.error(e);

		if (errorCallback)
			errorCallback(e);

		return;
	}

	dispatch(setSearchResults(results, state.search.query));
}

export const runAutocomplete = (patientId, errorCallback = null) => async (dispatch, getState) => {
	const state = getState();
	const terms = state.search.query.terms.split(',');

	if (terms.length <= 0 || terms[terms.length - 1].trim().length <= 0)
		return;

	let suggestions;
	try {
		suggestions = await autocomplete(state.session.authToken, patientId, terms[terms.length -1].trim());
	} catch(e) {
		if (e.name === 'HttpError' && e.code === 401)
			return dispatch(userSessionExpired());

		console.error(e);

		if (errorCallback)
			errorCallback(e);

		return;
	}

	dispatch(setAutocompleteSuggestions(suggestions.results));
}
