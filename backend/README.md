# Cloud Posture Scanner: Backend

An Express API that connects to **your own AWS account** and:

- **Discovers resources:** every EC2 instance in every enabled region, and every S3 bucket.
- **Runs 5 CIS AWS Foundations Benchmark checks** and returns PASS / FAIL with evidence.
- **Stores each CIS run in DynamoDB**, keyed by the date and time of the run.

All AWS calls are read-only (`Describe*`, `List*`, `Get*`). The scanner never changes anything in your account. The only write is saving CIS results to your own DynamoDB table.

The dashboard that displays this data lives in [`../frontend`](../frontend/README.md).

---

## API

| Method | Path | What it does |
|---|---|---|
| `GET` | `/health` | Returns `{ "status": "ok" }` |
| `GET` | `/instances` | Live scan of all enabled regions → `[{ id, type, region, ip, sgs, status }]` |
| `GET` | `/buckets` | Live scan of all buckets → `[{ name, region, encryption, policy, status }]` |
| `GET` | `/cis-results` | Runs all 5 CIS checks, saves the run to DynamoDB → `[{ id, title, status, evidence, checkedAt }]` |

- **Cooldown:** `/cis-results` allows one run every 10 seconds. Earlier calls get `429 Too Many Requests` with a `Retry-After` header and `retryAfter` in the body.
- **Errors:** always JSON, `{ "error": "<name>", "message": "<details>" }`, using the HTTP status code AWS returned (e.g. `403` for missing permissions).
- **Timing:** each scan takes about 3 seconds, because it queries every region in parallel.

### The 5 CIS checks

| id | Check | Passes when |
|---|---|---|
| `s3-public-access` | No S3 buckets publicly accessible | No bucket is public through its bucket policy or ACL (taking the bucket's Block Public Access settings into account) |
| `s3-encryption` | All S3 buckets encrypted | Every bucket has default encryption (SSE-S3 or SSE-KMS) |
| `iam-root-mfa` | IAM root account has MFA enabled | `AccountMFAEnabled = 1` in the IAM account summary |
| `cloudtrail-enabled` | CloudTrail is enabled | At least one **multi-region** trail is **logging** |
| `sg-admin-ports` | Security groups not open to 0.0.0.0/0 for SSH or RDP | No inbound rule from `0.0.0.0/0` covers TCP 22 or 3389 (including "all traffic" rules), in any region |

If a check can't run (for example, a missing permission), its status is `ERROR` and the AWS error appears as the evidence. The other checks still run.

---

## Prerequisites

- **Node.js 22 LTS** (or 20.19+). The AWS SDK v3 requires Node 20 or newer.
- An **AWS account** you can create IAM users and DynamoDB tables in.

## 1. Create an IAM user for the scanner

Don't use your root account's keys. Create a dedicated user with only the permissions the scanner needs.

1. AWS console → **IAM → Users → Create user**, e.g. `cloud-posture-scanner`. It doesn't need console access.
2. **Permissions:** choose one of these.
   - **Quick:** attach the AWS-managed **`SecurityAudit`** policy, which covers every scan and check. Then add the DynamoDB statements below as an inline policy.
   - **Least privilege:** attach this as a custom policy. Replace `<region>` and `<account-id>`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ScanResourcesReadOnly",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions",
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetEncryptionConfiguration",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketAcl",
        "iam:GetAccountSummary",
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus"
      ],
      "Resource": "*"
    },
    {
      "Sid": "StartupConnectionCheck",
      "Effect": "Allow",
      "Action": "dynamodb:ListTables",
      "Resource": "*"
    },
    {
      "Sid": "SaveCisRuns",
      "Effect": "Allow",
      "Action": "dynamodb:PutItem",
      "Resource": "arn:aws:dynamodb:<region>:<account-id>:table/cis-results"
    }
  ]
}
```

3. Open the user → **Security credentials → Create access key** → choose *Application running outside AWS*. Copy the **Access key ID** and **Secret access key**. The secret is only shown once.

## 2. Create the DynamoDB table (to save CIS runs)

AWS console → **DynamoDB → Create table**, in the **same region** you'll put in `AWS_REGION`:

| Setting | Value |
|---|---|
| Table name | `cis-results` |
| Partition key | `pk` (String) |
| Sort key | `runAt` (String) |
| Table settings → Customize → Capacity mode | **On-demand** |
| Encryption at rest | **AWS managed key** (`aws/dynamodb`) is recommended; the default also works |

After the table is created, go to **Additional settings → Time to Live → Turn on** and set the attribute to **`expiresAt`**. Runs then delete themselves after 90 days.

Each CIS run is saved as one item:

```json
{
  "pk": "CIS_RUN",
  "runAt": "2026-11-04T13:31:52.799Z",
  "durationMs": 3156,
  "summary": { "pass": 3, "fail": 2, "error": 0 },
  "results": [
    { "id": "iam-root-mfa", "title": "IAM root account has MFA enabled", "status": "PASS", "evidence": "Root account MFA is enabled (AccountMFAEnabled = 1)" }
  ],
  "expiresAt": 1801575112
}
```

The primary key is the **pair** (`pk`, `runAt`):
- All runs share the partition `CIS_RUN`, so they're stored together, sorted by time.
- The timestamp makes each run's key unique.
- "Latest run" is therefore a single `Query` (newest first, limit 1).

> The table is optional. Without it, the server logs a warning at startup, and CIS checks still run and return results. They just aren't saved.

## 3. Configure

```bash
git clone https://github.com/patrick-6-7/Cloud-Posture-Scanner.git
cd Cloud-Posture-Scanner/backend
cp .env.example .env
```

Fill in `.env`:

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | Port the API listens on |
| `CORS_ORIGIN1` | `http://localhost:5173` | URL of the dashboard, which is allowed to call the API |
| `CORS_ORIGIN2` | `http://localhost:5173` | Optional second allowed origin |
| `AWS_ACCESS_KEY_ID` | `AKIA…` | Access key from step 1 |
| `AWS_SECRET_ACCESS_KEY` | `…` | Secret key from step 1 |
| `AWS_REGION` | `us-east-1` | Region of the DynamoDB table, also used for global calls (S3 bucket list, IAM, EC2 region list). EC2 is still scanned in **every** enabled region. |

- `.env` is gitignored. Never commit real keys.
- **If you already use the AWS CLI:** you can delete the two key lines and add `AWS_PROFILE=<your-profile>` instead. The AWS SDK reads `~/.aws/credentials` automatically.

## 4. Install and run

```bash
npm install
npm start
```

A healthy start looks like this:

```
[INFO]: DynamoDB connected (us-east-1) - tables: cis-results
[INFO]: Health Router mounted at: /health
[INFO]: Instance Router mounted at: /instances
[INFO]: Bucket Router mounted at: /buckets
[INFO]: CIS Results Router mounted at: /cis-results
[INFO]: Server is running at http://localhost:5000
```

Try it:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/instances
curl http://localhost:5000/buckets
curl http://localhost:5000/cis-results
```

Then start the dashboard: see [`../frontend/README.md`](../frontend/README.md).

Logs go to the console and to `src/logs/info.log`, `warning.log` and `error.log`. The folder is created automatically, and log files are gitignored.

---
