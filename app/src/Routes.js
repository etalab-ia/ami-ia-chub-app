import React from 'react';
import { Switch, Redirect, Route } from 'react-router-dom';

import {
    ConnectedDashboard,
} from './views/Dashboard/index.jsx';

const Routes = () => {
    return (
        <Switch>
            <Redirect
                exact
                from="/"
                to="/dashboard"
            />
            <Route
                component={ConnectedDashboard}
                path="/dashboard"
            />
        </Switch>
    );
};

export default Routes;
