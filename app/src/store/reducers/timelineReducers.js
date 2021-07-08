import { combineReducers } from 'redux';
import {
    ADD_ITEMS,
} from '../actions';
import {USER_LOGOUT} from '../actions/sessionActions';

const initialState = {
    items: [],
};

function timeline(state = initialState, action) {
    switch (action.type) {
    case ADD_ITEMS:
        return Object.assign({}, state, {
            items: action.items,
        });

		case USER_LOGOUT:
			return initialState;

		default:
        return state;
    }
}

export const timelineReducers = combineReducers({
    timeline,
});
