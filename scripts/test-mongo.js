/* Simple test script to verify MongoDB connection using the mongodb driver directly. */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      // strip surrounding quotes
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

loadEnvLocal();

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'test';
  if (!uri) {
    console.error('MONGODB_URI is not set. Please set it in .env.local or the environment.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const stats = await db.stats();
    console.log('Connected to DB:', stats.db || db.databaseName);
    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Mongo test failed:', err);
    try { await client.close(); } catch (_) {}
    process.exit(1);
  }
})();
