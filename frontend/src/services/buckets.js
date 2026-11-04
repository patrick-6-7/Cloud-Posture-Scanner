// import s3Data from '../dummyData/S3.json';
const API_URL = import.meta.env.VITE_API_URL;

export const getBuckets = async () => {
  const response = await fetch(`${API_URL}/buckets`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Backend errors come back as { error, message } from its error middleware.
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
  // return s3Data;
};
