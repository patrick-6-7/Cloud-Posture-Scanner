import s3Data from '../dummyData/S3.json';

export const getBuckets = async () => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    return s3Data;
  } catch (error) {
    console.error('Error fetching buckets:', error);
    throw error;
  }
};
