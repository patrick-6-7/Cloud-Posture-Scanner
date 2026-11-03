import ec2Data from '../dummyData/EC2.json';

export const getInstances = async () => {
  try {
    return ec2Data;
  } catch (error) {
    console.error('Error fetching instances:', error);
    throw error;
  }
};
