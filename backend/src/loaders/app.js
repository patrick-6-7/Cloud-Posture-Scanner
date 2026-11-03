const logger = require('../utils/logger.js');

class AppLoader {
    async loadApp(app, PORT) {
        await new Promise((resolve) => {
            app.listen(PORT, () => {
                logger.info(`Server is running at http://localhost:${PORT}`);
                resolve();
            });
        });
    }
}

module.exports = new AppLoader();