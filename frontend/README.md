# Cloud Posture Scanner: Frontend

A React dashboard for the Cloud Posture Scanner API. It shows:

- **EC2 Instances:** ID, type, region, public IP, security groups and state, for every enabled region.
- **S3 Buckets:** name, region, encryption, access policy (public/private) and an overall status.
- **CIS AWS Benchmark Tests:** a **Run Tests** button that runs 5 CIS checks against your account and shows PASS / FAIL with evidence.

Built with React 19, Vite and Tailwind CSS 4. All data comes from the backend in [`../backend`](../backend/README.md), so set that up first.

---

## Prerequisites

- **Node.js 22 LTS** (or 20.19+), as required by Vite.
- The **backend running**, by default at `http://localhost:5000`. Follow [`../backend/README.md`](../backend/README.md) to give it access to your AWS account.

## Setup

```bash
cd Cloud-Posture-Scanner/frontend
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173**.

`.env` has one setting:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Base URL of the backend API |

- Vite reads `.env` only at startup. **Restart `npm run dev` after changing it.**
- **CORS:** the address you open the dashboard on must be allowed by the backend (`CORS_ORIGIN1`/`CORS_ORIGIN2` in `backend/.env`). If port 5173 is busy, Vite picks another port, such as 5174. Add that URL to the backend's `.env` and restart the backend.

## Using the dashboard

**EC2 Instances and S3 Buckets** load when the page opens. Each is a live scan of your account, so expect a few seconds of "Loading…".

| Column | Values |
|---|---|
| EC2 **Status** | `Running`, `Stopped`, `Pending`, `Stopping`, `Shutting-down` (terminated instances are hidden) |
| EC2 **Public IP** | `—` when the instance has none (e.g. stopped, or private only) |
| S3 **Encryption** | `AES256` (SSE-S3), `AWS-KMS`, `AWS-KMS-DSSE`, `None`, or `Unknown` (couldn't be read) |
| S3 **Access Policy** | `Public`, `Private`, or `Unknown` (couldn't be read) |
| S3 **Status** | `Exposed` (public), `Warning` (unencrypted or unknown), `Secure` |

**CIS AWS Benchmark Tests:**
1. Click **Run Tests**. A "Running CIS checks…" loader appears while the backend runs all 5 checks, which takes about 3 seconds.
2. Each check appears as a tile with its **PASS**, **FAIL** or **ERROR** badge and the evidence. Failures name the affected resources.
3. The header shows a summary, such as `3 passed · 2 failed · Last run 7:02:38 PM`. Each run is also saved to DynamoDB by the backend.
4. The backend allows one run every 10 seconds, so the button counts down (`Run Again (7s)`) before you can run again.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload (http://localhost:5173) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Working without the backend (dummy data)

Each service in `src/services/` can return sample data from `src/dummyData/` instead of calling the API. This is useful for UI work when the backend or AWS isn't available. In the service file:

1. Uncomment the dummy import at the top, e.g. `import ec2Data from '../dummyData/EC2.json';`.
2. Comment out the `fetch` block and return the dummy data instead, e.g. `return ec2Data;`.

Reverse the steps to go back to live data.

