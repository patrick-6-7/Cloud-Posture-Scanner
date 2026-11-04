import { useEffect, useState } from 'react';
import { getInstances } from './services/instances';
import { getBuckets } from './services/buckets';
import { getCisResults } from './services/cis-results';

export default function App() {
  const [ec2Data, setEc2Data] = useState([]);
  const [s3Data, setS3Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ec2Error, setEc2Error] = useState(null);
  const [s3Error, setS3Error] = useState(null);

  useEffect(() => {
    async function fetchData() {
      // Settled independently so a failing API call doesn't blank the other table.
      const [instances, buckets] = await Promise.allSettled([
        getInstances(),
        getBuckets()
      ]);

      if (instances.status === 'fulfilled') {
        setEc2Data(instances.value);
      } else {
        console.error("Failed to fetch instances:", instances.reason);
        setEc2Error(instances.reason.message);
      }

      if (buckets.status === 'fulfilled') {
        setS3Data(buckets.value);
      } else {
        console.error("Failed to fetch buckets:", buckets.reason);
        setS3Error(buckets.reason.message);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            AWS Resource Monitor
            <span className="text-xs bg-sky-500 text-slate-900 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Live</span>
          </h1>
          <div className="text-xs text-slate-400 font-mono">
            Last Updated: {new Date().toLocaleString()}
          </div>
        </header>

        {/* EC2 Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            EC2 Instances
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Instance ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Public IP</th>
                  <th className="px-4 py-3">Security Groups</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400">Loading instances...</td>
                  </tr>
                ) : ec2Error ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-red-400">Failed to load instances: {ec2Error}</td>
                  </tr>
                ) : ec2Data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400">No EC2 instances found.</td>
                  </tr>
                ) : (
                  ec2Data.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sky-400">{inst.id}</td>
                      <td className="px-4 py-3">{inst.type}</td>
                      <td className="px-4 py-3">{inst.region}</td>
                      <td className="px-4 py-3 font-mono text-sky-400">{inst.ip ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {inst.sgs.map(sg => (
                            <span key={sg} className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              {sg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inst.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* S3 Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            S3 Buckets
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Bucket Name</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Encryption</th>
                  <th className="px-4 py-3">Access Policy</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400">Loading buckets...</td>
                  </tr>
                ) : s3Error ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-red-400">Failed to load buckets: {s3Error}</td>
                  </tr>
                ) : s3Data.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400">No S3 buckets found.</td>
                  </tr>
                ) : (
                  s3Data.map((bucket) => (
                    <tr key={bucket.name} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sky-400">{bucket.name}</td>
                      <td className="px-4 py-3">{bucket.region}</td>
                      <td className="px-4 py-3">{bucket.encryption}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${policyStyles[bucket.policy] || 'bg-slate-700 text-slate-300'}`}>
                          {bucket.policy}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={bucket.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <CisSection />
      </div>
    </div>
  );
}

const resultEdgeStyles = {
  'PASS': 'border-l-green-500',
  'FAIL': 'border-l-red-500',
  'ERROR': 'border-l-amber-500',
};

function CisSection() {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  // One request runs every check on the backend; results are shown together when it returns.
  async function runTests() {
    setResults([]);
    setError(null);
    setIsRunning(true);
    try {
      setResults(await getCisResults());
    } catch (err) {
      console.error("Failed to run CIS checks:", err);
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errored = results.filter(r => r.status === 'ERROR').length;
  // Every result in a run shares the same checkedAt.
  const lastRun = results[0]?.checkedAt ? new Date(results[0].checkedAt).toLocaleTimeString() : null;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">CIS AWS Benchmark Tests</h2>
          {!isRunning && results.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-green-400">{passed} passed</span> · <span className="text-red-400">{failed} failed</span>
              {errored > 0 && <> · <span className="text-amber-400">{errored} could not run</span></>}
              {lastRun && <> · Last run {lastRun}</>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={runTests}
          disabled={isRunning}
          className="bg-sky-500 text-slate-900 font-semibold text-sm px-4 py-2 rounded-md hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : results.length > 0 || error ? 'Run Again' : 'Run Tests'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {!isRunning && !error && results.length === 0 && (
          <p className="text-sm text-slate-400">
            Run the CIS benchmark checks against your AWS account.
          </p>
        )}

        {isRunning && (
          <div
            aria-live="polite"
            className="flex items-center gap-3 border border-dashed border-slate-700 rounded-lg p-4 text-sm text-sky-400"
          >
            <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            Running CIS checks...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">Failed to run CIS checks: {error}</p>
        )}

        {results.map(result => (
          <div
            key={result.id}
            className={`bg-slate-800 border border-slate-700 border-l-4 ${resultEdgeStyles[result.status] || 'border-l-slate-500'} rounded-lg p-4`}
          >
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-semibold">{result.title}</h3>
              <StatusBadge status={result.status} />
            </div>
            <p className="text-sm text-slate-400 mt-1">{result.evidence}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// 'Unknown' (backend couldn't read the bucket's settings) falls back to a neutral pill.
const policyStyles = {
  'Private': 'bg-blue-500/10 text-blue-400',
  'Public': 'bg-red-500/10 text-red-400',
};

function StatusBadge({ status }) {
  const styles = {
    'Running': 'bg-green-500/10 text-green-400',
    'Stopped': 'bg-amber-500/10 text-amber-400',
    'Secure': 'bg-green-500/10 text-green-400',
    'Exposed': 'bg-red-500/10 text-red-400',
    'Warning': 'bg-amber-500/10 text-amber-400',
    'PASS': 'bg-green-500/10 text-green-400',
    'FAIL': 'bg-red-500/10 text-red-400',
    'ERROR': 'bg-amber-500/10 text-amber-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}
