const logger = require('../utils/logger.js');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { client, TABLES } = require('../config/dynamoDB.js');

class DBLoader {
    async loadDatabase() {
        const { TableNames = [] } = await client.send(new ListTablesCommand({}));
        const region = await client.config.region();
        logger.info(`DynamoDB connected (${region}) - tables: ${TableNames.join(', ') || 'none'} \n`);

        // Live checks still work without the table, so warn instead of failing startup.
        if (!TableNames.includes(TABLES.CIS_RESULTS)) {
            logger.warn(`Table '${TABLES.CIS_RESULTS}' not found in ${region} - CIS runs won't be saved until it's created \n`);
        }
    }
}

module.exports = new DBLoader();
