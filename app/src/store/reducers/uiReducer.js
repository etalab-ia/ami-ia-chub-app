import {DISPLAY_TOOLTIP, REMOVE_TOOLTIP, DISPLAY_POPIN, REMOVE_POPIN} from '../actions/uiActions';
import {USER_LOGOUT} from '../actions/sessionActions';

const initialState = {
	tooltip: null,
	popin: null
};

export default function(state = initialState, action) {
	switch(action.type) {
		case DISPLAY_TOOLTIP:
			return {...state, tooltip: action.payload};

		case REMOVE_TOOLTIP:
			return {...state, tooltip: null};

		case DISPLAY_POPIN:
			return {...state, popin: action.payload};

		case REMOVE_POPIN:
			return {...state, popin: null};

		case USER_LOGOUT:
			return initialState;

		default:
			return state;
	}
}
