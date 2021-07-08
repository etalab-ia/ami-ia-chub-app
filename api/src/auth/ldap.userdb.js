const ldap = require('ldapjs');

module.exports = config => (uid, password) => new Promise((resolve, reject) => {
	if (!/^[A-Za-z0-9-_.]+$/.test(uid))
		return resolve(false);

	const dsaUrl = config.dsaUrl || 'ldap://localhost';
	const bindDn = (config.bindDn || 'uid=$UID,ou=People,dc=example,dc=com').replaceAll('$UID', uid);
	const searchDn = typeof config.searchDn === 'string' ? config.searchDn.replaceAll('$UID', uid) : (config.searchDn ? bindDn : false);
	const searchBase = config.searchBase || 'ou=People,dc=example,dc=com';
	const searchScope = searchDn ? 'base' : (config.searchScope || 'sub');
	const searchFilter = (config.searchFilter || (searchDn ? '(objectClass=*)' : '(uid=$UID)')).replaceAll('$UID', uid);

	const client = ldap.createClient({url: dsaUrl});

	client.bind(bindDn, password, e => {
		if (e) {
			if (e instanceof ldap.InvalidCredentialsError)
				return resolve(false);

			return reject(e);
		}

		client.search(searchDn || searchBase, {filter: searchFilter, scope: searchScope, sizeLimit: 1}, (e, d) => {
			if (e)
				return reject(e);

			let entries = [];

			d.on('searchEntry', entry => entries.push(entry));
			d.on('error', e => reject(e));
			d.on('end', r => {
				client.unbind();

				if (r.status !== 0 || entries.length !== 1 || !entries[0].objectName)
					return resolve(false);

				resolve(entries[0].objectName);
			});
		});
	});
});
