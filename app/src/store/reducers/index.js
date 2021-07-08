import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { dashboardReducers } from './dashboardReducers.js';
import { timelineReducers } from './timelineReducers.js';
import search from './searchReducer';
import session from './sessionReducer';
import ui from './uiReducer';

export const rootReducer = history => combineReducers({
    router: connectRouter(history),
    dashboardReducers,
    timelineReducers,
		search,
		session,
		ui
});
