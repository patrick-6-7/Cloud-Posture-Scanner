const logger = require('../utils/logger.js');

const healthRouter = require('../routes/health.js');
const instanceRouter = require('../routes/instances.js');
const bucketRouter = require('../routes/buckets.js');
const cisResultsRouter = require('../routes/cisResults.js');

class RoutesLoader {
    constructor() {
        this.routes = [
            { path: '/health',         router: healthRouter,        name: 'Health Router'        },
            { path: '/instances',      router: instanceRouter,      name: 'Instance Router'      },
            { path: '/buckets',        router: bucketRouter,        name: 'Bucket Router'        },
            { path: '/cis-results',    router: cisResultsRouter,    name: 'CIS Results Router'   },
        ];
    }

    async loadRoutes(app) {
        logger.info('Mounting Routes...');

        this.routes.forEach(({ path, router, name }) => {
            app.use(path, router);
            logger.info(`${name} mounted at: ${path}`);
        });

        logger.info('Routes Mounted... \n');
    }
}

module.exports = new RoutesLoader();
