import mongoose from 'mongoose';
import { User } from '../src/modules/taxi/user/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected. Finding users...');
    const users = await User.find({}).limit(10).lean();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`Name: ${u.name}, Phone: ${u.phone}, Role: ${u.role}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
