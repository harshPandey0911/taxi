import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'appzeto_taxi'
    });
    console.log('Connected. Finding documents from taxivehicles...');
    const vehicles = await mongoose.connection.db.collection('taxivehicles').find({}).toArray();
    console.log(`Found ${vehicles.length} vehicles:`);
    vehicles.forEach(v => {
      console.log(JSON.stringify(v, null, 2));
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
