// import cisData from '../dummyData/CIS.json';
const API_URL = import.meta.env.VITE_API_URL;

// Matches the backend's cooldown on /cis-results (one run per 10 seconds).
export const CIS_COOLDOWN_SECONDS = 10;

export const getCisResults = async () => {
  const response = await fetch(`${API_URL}/cis-results`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // On 429 the backend also sends retryAfter (seconds) so the UI can count down.
    throw Object.assign(
      new Error(data?.message || `Request failed with status ${response.status}`),
      { retryAfter: data?.retryAfter }
    );
  }
  return data;

  // return cisData;
};
