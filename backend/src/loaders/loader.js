const logger = require('../utils/logger.js');
const DBLoader = require("./connectDB.js");
const MiddlewareLoader = require("./middleware.js");
const RoutesLoader = require("./routes.js");
const AppLoader = require("./app.js");

class Loader {
    async initializeApp(app, PORT, dbLink) {
        try {
            logger.info('Initializing Server... \n');
            await DBLoader.loadDatabase(dbLink);
            await MiddlewareLoader.loadMiddlewares(app);
            await RoutesLoader.loadRoutes(app);
            await AppLoader.loadApp(app, PORT);
        } catch (error) {
            logger.error('Failed To Load Server', error);
        }
    }
}

module.exports = new Loader();