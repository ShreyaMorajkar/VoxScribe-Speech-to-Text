const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getTranscriptions, transcribeAudio, deleteTranscription } = require('../controllers/transcriptController');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Multer File Filter to accept only audio files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
    'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 
    'audio/mp4', 'audio/aac', 'audio/flac'
  ];
  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB limit
});

// Define routes
router.get('/', getTranscriptions);
router.post('/transcribe', upload.single('audio'), transcribeAudio);
router.delete('/:id', deleteTranscription);

module.exports = router;
