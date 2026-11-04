const logger = require('../utils/logger.js');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { client } = require('../config/dynamoDB.js');

class DBLoader {
    async loadDatabase() {
        const { TableNames = [] } = await client.send(new ListTablesCommand({}));
        const region = await client.config.region();
        logger.info(`DynamoDB connected (${region}) - tables: ${TableNames.join(', ') || 'none'} \n`);
    }
}

module.exports = new DBLoader();
