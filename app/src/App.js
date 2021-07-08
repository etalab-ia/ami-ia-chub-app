import React, { Component } from 'react';
import { Router } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import Routes from './Routes.js';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { rootReducer } from './store';
import { ConnectedRouter } from 'connected-react-router';
import LoginGate from './views/login-gate.jsx';

const history = createBrowserHistory();
const store = createStore(rootReducer(history), (window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || (a => a))(applyMiddleware(thunk)));

let savedState = (state => ({
	'search.savedQueries': state.search.savedQueries,
	'session.authToken': state.session.authToken,
	'session.expires': state.session.expires
}))(store.getState());
store.subscribe(function() {
	const state = store.getState();

	if (state.search.savedQueries !== savedState['search.savedQueries']) {
		localStorage.setItem('dxcare.search.savedQueries', JSON.stringify(state.search.savedQueries));
		savedState['search.savedQueries'] = state.search.savedQueries;
	}

	if (state.session.authToken !== savedState['session.authToken']
		|| state.session.expires !== savedState['session.expires']) {
		localStorage.setItem('dxcare.session', JSON.stringify({
			authToken: state.session.authToken,
			expires: state.session.expires
		}));

		savedState['session.authToken'] = state.session.authToken;
		savedState['session.expires'] = state.session.expires;
	}
});

export default class App extends Component {
    render() {
        return (
            <Provider store={store}>
							<LoginGate>
                <ConnectedRouter history={history}>
                    <Router history={history}>
                        <Routes />
                    </Router>
                </ConnectedRouter>
							</LoginGate>
            </Provider>
        );
    }
}
