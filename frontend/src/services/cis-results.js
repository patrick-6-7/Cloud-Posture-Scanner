// import cisData from '../dummyData/CIS.json';
const API_URL = import.meta.env.VITE_API_URL;

export const getCisResults = async () => {
  const response = await fetch(`${API_URL}/cis-results`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;

  // return cisData;
};
