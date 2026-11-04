const logger = require('../utils/logger.js');

class AppLoader {
    async loadApp(app, PORT) {
        await new Promise((resolve, reject) => {
            // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback
            app.listen(PORT, (error) => {
                if (error) return reject(error);
                logger.info(`Server is running at http://localhost:${PORT}`);
                resolve();
            });
        });
    }
}

module.exports = new AppLoader();
