import mongoose from 'mongoose';
import { TaxiAppModule } from '../src/modules/taxi/admin/models/TaxiAppModule.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'appzeto_taxi'
    });
    console.log('Connected. Finding modules...');
    const modules = await TaxiAppModule.find({}).lean();
    console.log(`Found ${modules.length} modules:`);
    modules.forEach(m => {
      console.log(`ID: ${m._id}, Name: ${m.name}, Active: ${m.active}, Transport: ${m.transport_type}, Service: ${m.service_type}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
