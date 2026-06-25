import axios from 'axios';

const run = async () => {
  try {
    console.log('Fetching bootstrap settings from http://localhost:4000/api/users/bootstrap ...');
    const response = await axios.get('http://localhost:4000/api/users/bootstrap');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching:', error.response?.data || error.message);
    process.exit(1);
  }
};

run();
