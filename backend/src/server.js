require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/db');
const transcriptRoutes = require('./routes/transcriptRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow all in dev, specify origin for security
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder as static files for audio streaming
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/transcriptions', transcriptRoutes);

// Server Status Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Speech-to-Text API is healthy and operational.' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Initialize database and start listening
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Speech-to-Text Server running on port ${PORT}`);
    console.log(`👉 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`👉 Transcriptions: http://localhost:${PORT}/api/transcriptions`);
    console.log(`==================================================`);
  });
}

startServer();
