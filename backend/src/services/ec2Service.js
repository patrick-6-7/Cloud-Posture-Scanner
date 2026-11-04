const logger = require('../utils/logger.js');
const {
    EC2Client,
    DescribeRegionsCommand,
    paginateDescribeInstances
} = require('@aws-sdk/client-ec2');

// Terminated instances stay visible in DescribeInstances for ~1 hour; skip them.
const ACTIVE_STATES = ['pending', 'running', 'stopping', 'stopped', 'shutting-down'];

const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1);

class EC2Service {
    // Regions enabled for this account (opt-in regions that aren't enabled are excluded by AWS).
    async listRegions() {
        const client = new EC2Client({ region: process.env.AWS_REGION });
        const { Regions = [] } = await client.send(new DescribeRegionsCommand({}));
        return Regions.map((r) => r.RegionName);
    }

    async scanRegion(region) {
        const client = new EC2Client({ region });
        const paginator = paginateDescribeInstances(
            { client },
            { Filters: [{ Name: 'instance-state-name', Values: ACTIVE_STATES }] }
        );

        const instances = [];
        for await (const page of paginator) {
            for (const reservation of page.Reservations ?? []) {
                for (const instance of reservation.Instances ?? []) {
                    instances.push(this.toInstance(instance, region));
                }
            }
        }
        return instances;
    }

    // Shape expected by the frontend table (see frontend/src/dummyData/EC2.json).
    toInstance(instance, region) {
        return {
            id: instance.InstanceId,
            type: instance.InstanceType,
            region,
            ip: instance.PublicIpAddress ?? null,
            sgs: (instance.SecurityGroups ?? []).map((sg) => sg.GroupName),
            status: capitalize(instance.State?.Name)
        };
    }

    async scanAllRegions() {
        const startedAt = Date.now();
        const regions = await this.listRegions();
        const results = await Promise.allSettled(regions.map((region) => this.scanRegion(region)));

        const instances = [];
        const failures = [];
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                instances.push(...result.value);
            } else {
                failures.push(result.reason);
                logger.warn(`EC2 scan failed in ${regions[i]}: ${result.reason.message}`);
            }
        });

        // Every region failing usually means missing permissions; surface it instead of returning [].
        if (regions.length > 0 && failures.length === regions.length) {
            throw failures[0];
        }

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.info(`EC2 scan: ${instances.length} instances across ${regions.length - failures.length}/${regions.length} regions (${seconds}s)`);
        return instances;
    }
}

module.exports = new EC2Service();
