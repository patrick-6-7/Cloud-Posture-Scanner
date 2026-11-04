const {
    CloudTrailClient,
    DescribeTrailsCommand,
    GetTrailStatusCommand
} = require('@aws-sdk/client-cloudtrail');

class CloudTrailService {
    // Trails visible from the default region. includeShadowTrails makes multi-region
    // trails created in other regions show up here too.
    async listTrails() {
        const client = new CloudTrailClient({ region: process.env.AWS_REGION });
        const { trailList = [] } = await client.send(new DescribeTrailsCommand({ includeShadowTrails: true }));

        return Promise.all(trailList.map(async (trail) => {
            // Ask the trail's home region for its logging status.
            const homeClient = new CloudTrailClient({ region: trail.HomeRegion });
            const status = await homeClient.send(new GetTrailStatusCommand({ Name: trail.TrailARN }));
            return {
                name: trail.Name,
                homeRegion: trail.HomeRegion,
                isMultiRegion: trail.IsMultiRegionTrail === true,
                isLogging: status.IsLogging === true
            };
        }));
    }
}

module.exports = new CloudTrailService();
