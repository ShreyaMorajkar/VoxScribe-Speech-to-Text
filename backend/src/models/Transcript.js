const mongoose = require('mongoose');
const fs = require('fs');
const { getIsLocalDB, localDbPath } = require('../config/db');

// Define Schema for Mongoose
const TranscriptSchema = new mongoose.Schema({
  text: { type: String, required: true },
  filename: { type: String, required: true },
  audioPath: { type: String },
  duration: { type: Number, default: 0 },
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now }
});

const MongoTranscript = mongoose.model('Transcript', TranscriptSchema);

// Local DB methods
function readLocalData() {
  try {
    const data = fs.readFileSync(localDbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { transcriptions: [] };
  }
}

function writeLocalData(data) {
  fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2));
}

// Local mock model that matches Mongoose interface we will use
const LocalTranscript = {
  async find() {
    const data = readLocalData();
    // sort by createdAt descending
    return data.transcriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async create(obj) {
    const data = readLocalData();
    const newRecord = {
      _id: Math.random().toString(36).substring(2, 9),
      ...obj,
      createdAt: new Date().toISOString()
    };
    data.transcriptions.push(newRecord);
    writeLocalData(data);
    return newRecord;
  },

  async findByIdAndDelete(id) {
    const data = readLocalData();
    const index = data.transcriptions.findIndex(item => item._id === id);
    if (index !== -1) {
      const removed = data.transcriptions.splice(index, 1)[0];
      writeLocalData(data);
      return removed;
    }
    return null;
  }
};

// Return active model based on active database
const Transcript = {
  find(...args) {
    if (getIsLocalDB()) {
      return LocalTranscript.find(...args);
    }
    return MongoTranscript.find(...args).sort({ createdAt: -1 });
  },

  create(...args) {
    if (getIsLocalDB()) {
      return LocalTranscript.create(...args);
    }
    return MongoTranscript.create(...args);
  },

  findByIdAndDelete(...args) {
    if (getIsLocalDB()) {
      return LocalTranscript.findByIdAndDelete(...args);
    }
    return MongoTranscript.findByIdAndDelete(...args);
  }
};

module.exports = Transcript;
