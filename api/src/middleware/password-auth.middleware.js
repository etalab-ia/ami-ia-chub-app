import base64url from 'base64url';
import ldap from '@auth/ldap.userdb';
import staticConfig from '@auth/static-config.userdb';

export default config => {
	const userdbs = config.userdbs.map(({realm, kind, config}) => ({realm, authFn: {ldap, staticConfig}[kind](config)}));

	const authenticate = async ([uid, password]) => {
		for (let {realm, authFn} of userdbs) {
			try {
				const user = await authFn(uid, password);

				if (user)
					return `${realm}:${user}`;
			} catch(e) {
				console.warn(`Userdb failure while authenticating user '${uid}' against realm '${realm}': ${e}}`);
				continue;
			}
		}

		return null;
	};

	return async (req, res, next) => {
		const authz = (req.get('Authorization') || '').split(' ');

		if (authz.length === 2 && authz[0] === 'Basic') {
			const credentials = base64url.decode(authz[1]).split(':');

			if (credentials.length === 2) {
				const user = await authenticate(credentials);

				if (user)
					req.user = user;
			}
		}

		if (!req.user && config.required) {
			res.set('WWW-Authenticate', config.identity ? `Basic realm=${config.identity}` : 'Basic');
			return res.sendStatus(401);
		}

		next();
	};
};
