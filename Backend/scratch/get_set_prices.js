import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'appzeto_taxi'
    });
    console.log('Connected. Finding documents from taxisetprices...');
    const setPrices = await mongoose.connection.db.collection('taxisetprices').find({}).toArray();
    console.log(`Found ${setPrices.length} set prices:`);
    setPrices.forEach(sp => {
      console.log(JSON.stringify(sp, null, 2));
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
