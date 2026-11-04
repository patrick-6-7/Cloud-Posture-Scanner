const logger = require('../utils/logger.js');
const DBLoader = require("./dynamoDB.js");
const MiddlewareLoader = require("./middleware.js");
const RoutesLoader = require("./routes.js");
const AppLoader = require("./app.js");

class Loader {
    async initializeApp(app, PORT) {
        try {
            logger.info('Initializing Server... \n');
            await DBLoader.loadDatabase();
            await MiddlewareLoader.loadMiddlewares(app);
            await RoutesLoader.loadRoutes(app);
            await AppLoader.loadApp(app, PORT);
        } catch (error) {
            logger.error('Failed To Load Server', error);
            process.exitCode = 1;
        }
    }
}

module.exports = new Loader();
