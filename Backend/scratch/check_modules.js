import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { TaxiAppModule } from '../src/modules/taxi/admin/models/TaxiAppModule.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const modules = await TaxiAppModule.find({ active: 1 });
  console.log(JSON.stringify(modules, null, 2));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
