const crypto = require('crypto');
const base64url = require('base64url');

const sign = config => (sub, lifetime = null) => {
	const now = Math.floor(Date.now() / 1000);

	const payload = {
		iss: config.issuer,
		aud: config.audience,
		sub,
		iat: now,
		nbf: now,
		exp: now + (lifetime || config.lifetime)
	};

	const message = base64url.encode(JSON.stringify({typ: 'JWT', alg: 'HS256'})) + '.' + base64url.encode(JSON.stringify(payload));
	const signature = base64url.encode(crypto.createHmac('sha256', config.secret, {encoding: 'hex'}).update(message, 'ascii').digest());

	return message + '.' + signature;
}

const verify = config => token => {
	try {
		const parts = token.split('.');

		if (parts.length !== 3)
			return null;

		const header = JSON.parse(base64url.decode(parts[0]));

		if (typeof header !== 'object' || header === null || header.typ !== 'JWT' || header.alg !== 'HS256')
			return null;

		const message = parts[0] + '.' + parts[1];
		const signature = base64url.toBuffer(parts[2]);
		const verify_signature = crypto.createHmac('sha256', config.secret, {encoding: 'hex'}).update(message, 'ascii').digest();

		if (!signature.equals(verify_signature))
			return null;

		const payload = JSON.parse(base64url.decode(parts[1]));

		const now = Math.floor(Date.now() / 1000);

		if (typeof payload !== 'object' || payload === null
			|| ('nbf' in payload && now < payload.nbf) || ('exp' in payload && now > payload.exp))
			return null;

		if ((config.issuer && payload.iss !== config.issuer) || (config.audience && payload.aud !== config.audience) || !payload.sub)
			return null;

		return payload.sub;
	} catch(_) {
		return null;
	}
}

module.exports = {
	sign,
	verify
};