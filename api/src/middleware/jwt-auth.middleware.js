import jwt from '@auth/jwt';

export default config => {
	const verify = jwt.verify({
		issuer: config.issuer,
		audience: config.identity,
		secret: config.secret
	});

	return (req, res, next) => {
		const authz = (req.get('Authorization') || '').split(' ');

		if (authz.length === 2 && authz[0] === 'Bearer') {
			const user = verify(authz[1]);

			if (user)
				req.user = user;
		}

		if (!req.user && config.required) {
			res.set('WWW-Authenticate', config.identity ? `Bearer realm=${config.identity}` : 'Bearer');
			return res.sendStatus(401);
		}

		next();
	}
};
