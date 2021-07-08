import network from './index';

const base64url = data => btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '');

export const login = (uid, password, desiredLifetime = 28800) => network().post('/login', {desiredLifetime}, {
	headers: {
		'Accept': 'application/json',
		'Authorization': `Basic ${base64url(uid + ':' + password)}`,
		'Content-Type': 'application/json'
	}
});
