import express from 'express';
import jwt from '@auth/jwt';
import passwordAuthMiddleware from '@middleware/password-auth.middleware';

export default class LoginController {
	constructor(config) {
		this.signToken = jwt.sign({
			issuer: config.cdsIdentity,
			audience: config.apiIdentity,
			lifetime: config.defaultSessionLifetime || 86400,
			secret: config.jwtSecret
		});

		this.defaultLifetime = config.defaultSessionLifetime || 86400;
		this.maxLifetime = config.maxSessionLifetime || 86400;

		this.router = express.Router();
		this.router.post('/login',
			passwordAuthMiddleware({userdbs: config.userdbs, required: true, identity: config.cdsIdentity}),
			this.login.bind(this));
	}

	login(req, res) {
		const lifetime = req.body.desiredLifetime && req.body.desiredLifetime <= this.maxLifetime ? req.body.desiredLifetime : null;
		const token = this.signToken(req.user, lifetime);

		res.status(201).json({token_type: 'Bearer', access_token: token, expires_in: lifetime || this.defaultLifetime});
	}
};
