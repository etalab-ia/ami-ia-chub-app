import {
	SET_LOGIN_FORM_STATE,
	USER_LOGIN,
	USER_LOGOUT
} from '../actions/sessionActions';

import {LoginFormState} from '../defs';

const initialState = (function() {
	const defaultState = {authToken: null, expires: null, loginFormState: LoginFormState.FRESH};

	const s = localStorage.getItem('dxcare.session');

	if (!s)
		return defaultState;

	let p;
	try {
		p = JSON.parse(s);
	} catch(_) {
		localStorage.removeItem('dxcare.session');
		return defaultState;
	}

	if (!p.authToken) {
		localStorage.removeItem('dxcare.session');
		return defaultState;
	}

	if (p.expires && Date.now() >= p.expires) {
		localStorage.removeItem('dxcare.session');
		return {...defaultState, loginFormState: LoginFormState.SESSION_EXPIRED};
	}

	return {...defaultState, authToken: p.authToken, expires: p.expires || null};
})();

export default function(state = initialState, action) {
	switch(action.type) {
		case SET_LOGIN_FORM_STATE:
			return {...state, loginFormState: action.payload};

		case USER_LOGIN:
			return {...state, authToken: action.payload.token, expires: action.payload.expires, loginFormState: LoginFormState.FRESH};

		case USER_LOGOUT:
			return {...state, authToken: null, expires: null, loginFormState: action.payload || LoginFormState.FRESH};

		default:
			return state;
	}
};
