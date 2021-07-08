import React from 'react';
import {connect} from 'react-redux';
import {Button, Input, Select} from 'antd';
import {loginWithUidAndPassword} from '../store/actions/sessionActions';
import {LoginFormState} from '../store/defs';
import '../styles/index.css';
import '../styles/login.css';

export default connect(state => ({
	isLoggedIn: !!state.session.authToken,
	loginFormState: state.session.loginFormState
}), {loginWithUidAndPassword})(class LoginGate extends React.PureComponent {
	constructor(props) {
		super(props);

		this.state = {
			wasLoggedIn: props.isLoggedIn,
			uid: '',
			password: '',
			lifetime: 28800
		};
	}

	static getDerivedStateFromProps(props, state) {
		// Make sure the form and especially password field is reset after login
		// We do it here instead of using a key because our parent can't be connected to the store

		if (props.isLoggedIn !== state.wasLoggedIn)
			return {wasLoggedIn: props.isLoggedIn, uid: '', password: '', lifetime: 28800};

		return null;
	}

	setUid = e => this.setState({uid: e.target.value});
	setPassword = e => this.setState({password: e.target.value});
	setLifetime = value => this.setState({lifetime: value});

	login = () => {
		if (this.props.loginFormState !== LoginFormState.ATTEMPTING_LOGIN && this.state.uid && this.state.password)
			this.props.loginWithUidAndPassword(this.state.uid, this.state.password, this.state.lifetime);
	}

	render = () => this.props.isLoggedIn ? this.props.children : <div className="login-page">
		<div className="login-form fcol fgapd">
			<div className="login-form-title">Authentification requise - CHU de Bordeaux</div>

			{this.props.loginFormState === LoginFormState.LOGGED_OUT && <div className="login-form-msg">Session terminée à votre demande</div>}
			{this.props.loginFormState === LoginFormState.SESSION_EXPIRED && <div className="login-form-msg">Durée maximale de la session atteinte, veuillez vous reconnecter</div>}
			{this.props.loginFormState === LoginFormState.BAD_CREDENTIALS && <div className="login-form-msg login-form-msg-error">Authentification refusée, vérifiez votre login et votre mot de passe</div>}
			{this.props.loginFormState === LoginFormState.ERROR && <div className="login-form-msg login-form-msg-error">Une erreur inattendue s'est produite</div>}

			<div className="login-form-fields fcol fgap">
				<div className="login-form-field frow fgap facenter">
					<label htmlFor="login-form-field-uid">Login</label>
					<div className="login-form-field-input">
						<Input id="login-form-field-uid" value={this.state.uid} onChange={this.setUid} onPressEnter={this.login} />
					</div>
				</div>

				<div className="login-form-field frow fgap facenter">
					<label htmlFor="login-form-field-password">Mot de passe</label>
					<div className="login-form-field-input">
						<Input.Password id="login-form-field-password" value={this.state.password} onChange={this.setPassword} onPressEnter={this.login} />
					</div>
				</div>

				<div className="login-form-field frow fgap facenter">
					<label>Durée de la session</label>
					<div className="login-form-field-input">
						<Select value={this.state.lifetime} onChange={this.setLifetime}>
							<Select.Option value={600}>10 minutes</Select.Option>
							<Select.Option value={1800}>30 minutes</Select.Option>
							<Select.Option value={3600}>1 heure</Select.Option>
							<Select.Option value={7200}>2 heures</Select.Option>
							<Select.Option value={14400}>4 heures</Select.Option>
							<Select.Option value={28800}>8 heures</Select.Option>
							<Select.Option value={43200}>12 heures</Select.Option>
							<Select.Option value={86400}>1 jour</Select.Option>
							<Select.Option value={432000}>5 jours</Select.Option>
							<Select.Option value={604800}>1 semaine</Select.Option>
						</Select>
					</div>
				</div>
			</div>

			<div className="frow fjend fgap">
				<Button onClick={this.login}
					disabled={!this.state.uid || !this.state.password}
					loading={this.props.loginFormState === LoginFormState.ATTEMPTING_LOGIN}
					type="primary">Connexion</Button>
			</div>
		</div>
	</div>;
});
