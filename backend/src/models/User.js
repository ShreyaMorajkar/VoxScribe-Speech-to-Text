const mongoose = require('mongoose');
const fs = require('fs');
const { getIsLocalDB, localDbPath } = require('../config/db');

// Define Schema for Mongoose
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  avatar: { type: String },
  googleId: { type: String },
  isVerified: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const MongoUser = mongoose.model('User', UserSchema);

// Local DB helper methods
function readLocalData() {
  try {
    const data = fs.readFileSync(localDbPath, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) {
      parsed.users = [];
    }
    return parsed;
  } catch (err) {
    return { transcriptions: [], users: [] };
  }
}

function writeLocalData(data) {
  fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2));
}

// Attach a helper .save() mock function to local objects to mimic Mongoose syntax
function wrapLocalUser(user) {
  if (!user) return null;
  
  // Attach save helper
  user.save = async function() {
    const fileData = readLocalData();
    const index = fileData.users.findIndex(u => u._id === user._id);
    if (index !== -1) {
      const cleanUser = { ...user };
      delete cleanUser.save; // Keep database file clean of function blocks
      fileData.users[index] = cleanUser;
      writeLocalData(fileData);
    }
  };
  return user;
}

// Local mock model that matches Mongoose interface we will use
const LocalUser = {
  async findOne(query) {
    const data = readLocalData();
    let user = null;
    
    if (query._id) {
      user = data.users.find(u => u._id === query._id) || null;
    } else if (query.email) {
      user = data.users.find(u => u.email.toLowerCase() === query.email.toLowerCase()) || null;
    }
    
    return wrapLocalUser(user);
  },

  async create(obj) {
    const data = readLocalData();
    if (data.users.some(u => u.email.toLowerCase() === obj.email.toLowerCase())) {
      throw new Error('User already exists');
    }
    
    const newRecord = {
      _id: Math.random().toString(36).substring(2, 9),
      isVerified: false, // Default to unverified for local signup
      ...obj,
      createdAt: new Date().toISOString()
    };
    
    data.users.push(newRecord);
    writeLocalData(data);
    return wrapLocalUser(newRecord);
  }
};

// Return active model based on active database
const User = {
  findOne(query) {
    if (getIsLocalDB()) {
      return LocalUser.findOne(query);
    }
    return MongoUser.findOne(query);
  },

  create(obj) {
    if (getIsLocalDB()) {
      return LocalUser.create(obj);
    }
    return MongoUser.create(obj);
  }
};

module.exports = User;
