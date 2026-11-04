import { useEffect, useState } from 'react';
import { getInstances } from './services/instances';
import { getBuckets } from './services/buckets';

export default function App() {
  const [ec2Data, setEc2Data] = useState([]);
  const [s3Data, setS3Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ec2Error, setEc2Error] = useState(null);

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
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const publicBucketsCount = s3Data.filter(b => b.policy === 'Public').length;

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

        {/* Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatTile label="Active EC2 Instances" value={loading ? '...' : ec2Data.length} />
          <StatTile label="S3 Buckets" value={s3Data.length} />
          <StatTile label="Public Buckets" value={publicBucketsCount} color="text-red-400" />
          <StatTile label="Regions Active" value="3" />
        </div>

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
                {s3Data.map((bucket) => (
                  <tr key={bucket.name} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sky-400">{bucket.name}</td>
                    <td className="px-4 py-3">{bucket.region}</td>
                    <td className="px-4 py-3">{bucket.encryption}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bucket.policy === 'Private' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                        {bucket.policy}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={bucket.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, color = "text-slate-100" }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Running': 'bg-green-500/10 text-green-400',
    'Stopped': 'bg-amber-500/10 text-amber-400',
    'Secure': 'bg-green-500/10 text-green-400',
    'Exposed': 'bg-red-500/10 text-red-400',
    'Warning': 'bg-amber-500/10 text-amber-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}
