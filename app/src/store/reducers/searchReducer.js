import {
	CLEAR_SEARCH_RESULTS,
	CLEAR_SUGGESTIONS,
	DELETE_SAVED_QUERY,
	LOAD_QUERY,
	LOAD_QUERY_FROM_HISTORY,
	SAVE_QUERY,
	SAVE_QUERY_TO_HISTORY,
	SET_AUTOCOMPLETE_SUGGESTIONS,
	SET_QUERY,
	SET_QUERY_COMBINATION,
	SET_QUERY_MATCHING,
	SET_QUERY_TERMS,
	SET_SEARCH_RESULTS
} from '../actions/searchActions';
import {USER_LOGOUT} from '../actions/sessionActions';

import {SearchQueryCombination, SearchQueryMatching} from '../defs';

const initialState = {
	query: {
		terms: '',
		matching: SearchQueryMatching.EQUAL,
		combination: SearchQueryCombination.AND
	},
	savedQueries: (function() {
		const s = localStorage.getItem('dxcare.search.savedQueries');

		if (!s)
			return [];

		let p;
		try {
			p = JSON.parse(s);
		} catch(_) {
			localStorage.removeItem('dxcare.search.savedQueries');
			return [];
		}

		if (!Array.isArray(p) || !p.every(a => typeof a.name === 'string' && a.query && typeof a.query.terms === 'string'
			&& a.query.matching && SearchQueryMatching._keyOf(a.query.matching)
			&& a.query.combination && SearchQueryCombination._keyOf(a.query.combination))) {
			localStorage.removeItem('dxcare.search.savedQueries');
			return [];
		}

		return p;
	})(),
	history: [],
	autocomplete: [],
	results: null,
	suggestions: null
};

export default function(state = initialState, action) {
	switch (action.type) {
		case SET_QUERY:
			return {...state, query: {...action.payload}, autocomplete: []};

		case SET_QUERY_TERMS:
			return {...state, query: {...state.query, terms: action.payload}, autocomplete: []};

		case SET_QUERY_MATCHING:
			return {...state, query: {...state.query, matching: action.payload}};

		case SET_QUERY_COMBINATION:
			return {...state, query: {...state.query, combination: action.payload}};

		case SAVE_QUERY:
			return {...state, savedQueries: [...state.savedQueries, {name: action.payload, query: state.query}]};

		case LOAD_QUERY:
			return {...state, query: state.savedQueries[action.payload].query, autocomplete: []};

		case DELETE_SAVED_QUERY:
			return {...state, savedQueries: [...state.savedQueries.slice(0, action.payload), ...state.savedQueries.slice(action.payload + 1)]};

		case SET_SEARCH_RESULTS:
			return {...state, results: action.payload, autocomplete: [],
				suggestions: state.suggestions === null && 'recommandations' in action.payload.results ? action.payload.results.recommandations : state.suggestions};

		case CLEAR_SEARCH_RESULTS:
			return {...state, results: null};

		case CLEAR_SUGGESTIONS:
			return {...state, suggestions: null};

		case SET_AUTOCOMPLETE_SUGGESTIONS:
			return {...state, autocomplete: action.payload.slice(0, 10)};

		case SAVE_QUERY_TO_HISTORY:
			return state.history.length < 1 || state.history[state.history.length - 1] !== action.payload ?
				{...state, history: [...state.history, action.payload]} : state;

		case LOAD_QUERY_FROM_HISTORY:
			return {...state, query: state.history[action.payload]};

		case USER_LOGOUT:
			return initialState;

		default:
			return state;
	}
}
