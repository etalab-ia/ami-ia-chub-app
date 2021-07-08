import {login} from '../../network/login';
import {LoginFormState} from '../defs';

export const SET_LOGIN_FORM_STATE = 'SET_LOGIN_FORM_STATE';
export const USER_LOGIN = 'USER_LOGIN';
export const USER_LOGOUT = 'USER_LOGOUT';

export const setLoginFormState = state => ({type: SET_LOGIN_FORM_STATE, payload: state});
export const userLogin = (token, expires = null) => ({type: USER_LOGIN, payload: {token, expires}});
export const userLogout = () => ({type: USER_LOGOUT, payload: LoginFormState.LOGGED_OUT});
export const userSessionExpired = () => ({type: USER_LOGOUT, payload: LoginFormState.SESSION_EXPIRED});

export const loginWithUidAndPassword = (uid, password, lifetime = 28800) => async (dispatch, getState) => {
	dispatch(setLoginFormState(LoginFormState.ATTEMPTING_LOGIN));

	let r;
	try {
		r = await login(uid, password, lifetime);
	} catch(e) {
		if (e.name === 'HttpError' && e.code === 401)
			return dispatch(setLoginFormState(LoginFormState.BAD_CREDENTIALS));

		console.error(e);
		return dispatch(setLoginFormState(LoginFormState.ERROR));
	}

	dispatch(userLogin(r.access_token, r.expires_in ? Date.now() + r.expires_in * 1000 : null));
};
