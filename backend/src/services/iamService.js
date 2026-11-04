const { IAMClient, GetAccountSummaryCommand } = require('@aws-sdk/client-iam');

class IAMService {
    // IAM is a global service; any region works for the client.
    async getAccountSummary() {
        const client = new IAMClient({ region: process.env.AWS_REGION });
        const { SummaryMap = {} } = await client.send(new GetAccountSummaryCommand({}));
        return SummaryMap;
    }
}

module.exports = new IAMService();
