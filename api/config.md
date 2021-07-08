App configuration is done as a JSON object in file `config/default.json` with
the following keys:

Key | Type | Description
--- | --- | ---
port | number | Port number the server should listen on
elasticUrl | string | URL of the elasticsearch server
fhirUrl | string | Host name or IP address of the FHIR API server. This is NOT an URL
neo4j.uri | string | URL of the Neo4j server
neo4j.username | string | Neo4j user login
neo4j.password | string | Neo4j user password
auth.cdsEnabled | boolean | Whether the integrated Credentials Distribution Service should be enabled. If this is turned off, credentials will need to be issued to clients through other means
auth.cdsIdentity | string | Identity string of the Credentials Distribution Service. This must match the issuer (iss) claim in client credentials. If the integrated Credentials Distribution Service is used, this can be any arbitrary string
auth.apiIdentity | string | Identity string of the API service. This must match the audience (aud) claim in client credentials. If the integrated Credentials Distribution Service is used, this can be any arbitrary string
auth.jwtSecret | string | Hex-encoded secret used to sign and verify client credentials. Should be cryptographic-quality random and at least 128 bits. If credentials are issued by a third party, this must match the secret used on their side. **DO NOT USE THE DEFAULT VALUE**
auth.defaultSessionLifetime | number | Default lifetime in seconds of credentials issued by the integrated Credentials Distribution Service. Clients can override this in their request
auth.maxSessionLifetime | number | Upper limit in seconds on the lifetime clients can request for credentials issued by the integrated Credentials Distribution Service
auth.userdbs | array | List of user database definitions, if the integrated Credentials Distribution Service is used

User databases are defined by an object of this form:
Key | Type | Description
--- | --- | ---
realm | string | An arbitrary string used as a namespace to separate users from different databases
kind | string | Database provider, currently the only two supported values are 'ldap' and 'staticConfig'
config | string | Provider-specific configuration

The staticConfig provider allows defining users directly in the config file. Its
config object has a single property `users` which is a mapping of usernames to
hashed and salted password.

To hash a password:
Taking as input the user's password and a random salt (recommended length 8 to
16 bytes), both as byte strings; with `||` the string concatenation operator,
`HEX` a function that takes a byte string and encodes each byte as two
hexadecimal digits in their ASCII representation, and `SHA256` the SHA-256
function as defined by RFC6234, the hashed password is:
`HEX(salt) || '.' || HEX(SHA256(salt || password))`

The ldap provider is configured by an object of this form:
If the exact string `$UID` appears anywhere in bindDn, searchDn or searchFilter, it is replaced by the user's supplied login
Key | Type | Description
--- | --- | ---
dsaUrl | string | URL of the LDAP server
bindDn | string | DN to bind as. `$UID` is replaced here
searchFilter | string | Filter to search the directory for. The search must return exactly one entry for authentication to succeed. `$UID` is replaced here
searchBase | string | Base of the search
searchScope | string | Scope of the search
searchDn | string or boolean | If this is true or a string, searchBase and searchScope (but not searchFilter if it is specified) are ignored and the specified DN is requested with scope base instead. True means the bind DN. `$UID` is replaced here

Here is an example configuration:
```
{realm: 'example.com', kind: 'ldap', config: {
	dsaUrl: 'ldaps://directory.example.com',
	bindDn: 'uid=$UID,ou=People,dc=example,dc=com',
	searchFilter: '(uid=$UID)',
	searchBase: 'ou=People,dc=example,dc=com',
	searchScope: 'one'
}}
```
