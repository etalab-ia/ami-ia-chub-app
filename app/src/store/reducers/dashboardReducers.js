import { combineReducers } from 'redux';
import {
    ADD_PATIENT,
} from '../actions';
import {USER_LOGOUT} from '../actions/sessionActions';

const initialState = {
    patient: {},
};

function dashboard(state = initialState, action) {
    switch (action.type) {
    case ADD_PATIENT:
        return Object.assign({}, state, {
            patient: action.data,
        });

		case USER_LOGOUT:
			return initialState;

		default:
        return state;
    }
}

export const dashboardReducers = combineReducers({
    dashboard,
});
