import express from 'express';
import Config from 'config';
import bodyParser from 'body-parser';
import cors from 'cors';
// Tools
import logger from '@tools/logger';
// Middleware
import { loggerMiddleware } from '@middleware/logger.middleware.js';
// Controller
import LoginController from '@controllers/login.js';
import { patientController } from '@controllers/patient.js';

class App {
    constructor() {
        this.app = express();
        this.controllers = [
            new patientController({auth: Config.auth})
        ];

				if (Config.auth.cdsEnabled)
					this.controllers.push(new LoginController(Config.auth));

				this.initializeMiddlewares = this.initializeMiddlewares.bind(this);
        this.initializeControllers = this.initializeControllers.bind(this);
        this.initializeMiddlewares();
        this.initializeControllers();
    }

    listen() {
        this.app.listen(Config.port, () => {
            logger.info('/*************** *************** ***************/');
            logger.info('/*************** STARTING SERVER ***************/');
            logger.info('/*************** *************** ***************/');
            logger.info(`App listening on the port ${Config.port}`);
        }).on('error', (err) => {
            logger.error(err);
            process.exit(1);
        });
    }

    initializeMiddlewares() {
        this.app.use(cors());
        this.app.use(bodyParser.json({limit: '50mb', extended: true}));
        this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
        this.app.use(loggerMiddleware);
    }

    initializeControllers() {
        this.app.get('/', (req, res) => {
            res.send('Hello in CHUB api !');
        });
        this.controllers.forEach((controller) => {
            this.app.use('/', controller.router);
        });
        this.app.get('*', (req, res) => {
            res.status(404).send('404 Not Found');
        });
    }

}

export { App };
