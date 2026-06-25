import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to Mongo...');
    const client = await mongoose.connect(process.env.MONGODB_URI);
    const db = client.connection.db;
    console.log('Listing databases...');
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('Databases:', dbs.databases.map(d => d.name));
    
    for (const d of dbs.databases) {
      if (['admin', 'local', 'config'].includes(d.name)) continue;
      console.log(`\nDatabase: ${d.name}`);
      const conn = mongoose.connection.useDb(d.name);
      const collections = await conn.db.listCollections().toArray();
      console.log('Collections:', collections.map(c => c.name));
      
      if (collections.map(c => c.name).includes('taxiappmodules')) {
        const docs = await conn.db.collection('taxiappmodules').find({}).toArray();
        console.log(`- taxiappmodules documents count: ${docs.length}`);
        docs.forEach(doc => {
          console.log(`  * ID: ${doc._id}, Name: ${doc.name}, Active: ${doc.active}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
