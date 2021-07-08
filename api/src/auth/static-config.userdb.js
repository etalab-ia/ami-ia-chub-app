const crypto = require('crypto');

module.exports = config => async (uid, password) => {
	if (!(uid in config.users))
		return false;

	const [salt, hash] = config.users[uid].split('.');

	if (crypto.createHash('sha256').update(salt, 'hex').update(password).digest('hex') !== hash)
		return false;

	return uid;
};

module.exports.hashPassword = password => {
	const salt = crypto.randomBytes(8);

	return `${salt.toString('hex')}.${crypto.createHash('sha256').update(salt).update(password).digest('hex')}`;
}
