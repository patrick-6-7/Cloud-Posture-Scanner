const logger = require('../utils/logger.js');
const {
    EC2Client,
    DescribeRegionsCommand,
    paginateDescribeInstances,
    paginateDescribeSecurityGroups
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

    // Runs scanFn(region) in every enabled region in parallel and merges the returned arrays.
    // A failing region is logged and skipped; if every region fails (usually missing
    // permissions) the error is thrown instead of returning a misleading empty result.
    async scanEachRegion(label, scanFn) {
        const regions = await this.listRegions();
        const results = await Promise.allSettled(regions.map((region) => scanFn(region)));

        const items = [];
        const failures = [];
        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                items.push(...result.value);
            } else {
                failures.push(result.reason);
                logger.warn(`${label} failed in ${regions[i]}: ${result.reason.message}`);
            }
        });

        if (regions.length > 0 && failures.length === regions.length) {
            throw failures[0];
        }

        return { items, regionsScanned: regions.length - failures.length, regionsTotal: regions.length };
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
        const { items, regionsScanned, regionsTotal } = await this.scanEachRegion(
            'EC2 scan',
            (region) => this.scanRegion(region)
        );

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.info(`EC2 scan: ${items.length} instances across ${regionsScanned}/${regionsTotal} regions (${seconds}s)`);
        return items;
    }

    // Security groups that have at least one inbound rule from 0.0.0.0/0, in one region.
    async listOpenSecurityGroupsInRegion(region) {
        const client = new EC2Client({ region });
        const paginator = paginateDescribeSecurityGroups(
            { client },
            { Filters: [{ Name: 'ip-permission.cidr', Values: ['0.0.0.0/0'] }] }
        );

        const groups = [];
        for await (const page of paginator) {
            for (const group of page.SecurityGroups ?? []) {
                groups.push({
                    id: group.GroupId,
                    name: group.GroupName,
                    region,
                    ipPermissions: group.IpPermissions ?? []
                });
            }
        }
        return groups;
    }

    async listInternetOpenSecurityGroups() {
        return this.scanEachRegion(
            'Security group scan',
            (region) => this.listOpenSecurityGroupsInRegion(region)
        );
    }
}

module.exports = new EC2Service();
