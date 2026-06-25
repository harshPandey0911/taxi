import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'appzeto_taxi'
    });
    console.log('Connected. Finding ride modules from taxiridemodules...');
    const rideModules = await mongoose.connection.db.collection('taxiridemodules').find({}).toArray();
    console.log(`Found ${rideModules.length} ride modules:`);
    rideModules.forEach(rm => {
      console.log(JSON.stringify(rm, null, 2));
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
