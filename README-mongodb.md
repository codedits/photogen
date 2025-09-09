# MongoDB setup (Windows) and quick test

This project uses the official `mongodb` Node.js driver. The `src/lib/mongodb.ts` helper provides `getMongoClient()` and `getDatabase()` to reuse a single client during development.

Quick steps to install MongoDB Server on Windows (developer machine):

1. Download the MongoDB Community Server MSI from https://www.mongodb.com/try/download/community and install it.
2. During install, optionally install MongoDB as a Windows Service.
3. Start the server with the Services app or from PowerShell:

```powershell
# if installed as a service
Start-Service -Name MongoDB
# if installed manually, run mongod with a data directory
mongod --dbpath "C:\data\db"
```

Create a database user and password (optional but recommended) using `mongo` or `mongosh`.

Set environment variables for Next.js (create `.env.local` in the project root):

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=photogen
```

Test connection locally using Node (PowerShell):

```powershell
# Run a quick node script to test (uses the helper)
node -e "(async()=>{const db=(await import('./src/lib/mongodb')).getDatabase;const d=await db();console.log('OK', (await d.stats()).db);process.exit(0)})().catch(e=>{console.error(e);process.exit(1)})"
```

Or add a small script in `package.json`:

```
"scripts": {
  "test:mongo": "node ./scripts/test-mongo.js"
}
```

And create `scripts/test-mongo.js` that imports `src/lib/mongodb.js` and prints a simple query result.

If you'd like, I can create the `scripts/test-mongo.js` test file and wire a script in `package.json`.
