const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true }
});

// Table names in one place (tables are created in the AWS console).
const TABLES = {
    CIS_RESULTS: 'cis-results'
};

module.exports = { client, docClient, TABLES };
