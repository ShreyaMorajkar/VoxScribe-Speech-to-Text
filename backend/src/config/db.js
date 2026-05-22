const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isLocalDB = false;
const localDbPath = path.join(__dirname, '../../data/db.json');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('🚀 Connected to MongoDB Cloud successfully!');
      isLocalDB = false;
      return true;
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB. Falling back to local file database...');
      setupLocalDB();
      return false;
    }
  } else {
    console.log('ℹ️  No MONGODB_URI provided. Initializing local JSON file database (zero-setup)...');
    setupLocalDB();
    return false;
  }
}

function setupLocalDB() {
  const dir = path.dirname(localDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(localDbPath)) {
    fs.writeFileSync(localDbPath, JSON.stringify({ transcriptions: [] }, null, 2));
  }
  console.log(`📁 Local JSON file database loaded at: ${localDbPath}`);
  isLocalDB = true;
}

const getIsLocalDB = () => isLocalDB;

module.exports = { connectDB, getIsLocalDB, localDbPath };
