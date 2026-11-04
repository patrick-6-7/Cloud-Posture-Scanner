const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLES } = require('../config/dynamoDB.js');

// Every run shares one partition; runAt (ISO-8601 UTC) as the sort key keeps runs in
// time order, so "latest run" / "last N runs" are simple Queries.
const PARTITION_KEY = 'CIS_RUN';

// Old runs are removed automatically by DynamoDB TTL on the expiresAt attribute.
const RETENTION_DAYS = 90;

class CisRunModel {
    async save({ runAt, durationMs, summary, results }) {
        const expiresAt = Math.floor(Date.parse(runAt) / 1000) + RETENTION_DAYS * 24 * 60 * 60;

        await docClient.send(new PutCommand({
            TableName: TABLES.CIS_RESULTS,
            Item: {
                pk: PARTITION_KEY,
                runAt,
                durationMs,
                summary,
                // checkedAt is stored once as runAt, not per result.
                results: results.map(({ id, title, status, evidence }) => ({ id, title, status, evidence })),
                expiresAt
            },
            // Never overwrite an existing run with the same timestamp.
            ConditionExpression: 'attribute_not_exists(runAt)'
        }));
    }
}

module.exports = new CisRunModel();
