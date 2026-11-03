const logger = require('../utils/logger.js');

const userRouter = require('../routes/users.js');
const productRouter = require('../routes/products.js');

class RoutesLoader {
    constructor() {
        this.routes = [
            { path: '/users',          router: userRouter,          name: 'User Router'         },
            { path: '/products',       router: productRouter,       name: 'Product Router'       },
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
