const fs = require('fs');
const path = require('path');
const { AssemblyAI } = require('assemblyai');
const Transcript = require('../models/Transcript');

// Initialize AssemblyAI if key exists
let aaiClient = null;
if (process.env.ASSEMBLYAI_API_KEY) {
  aaiClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
}

// Fetch all transcriptions
const getTranscriptions = async (req, res) => {
  try {
    const list = await Transcript.find();
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error fetching transcriptions', error: error.message });
  }
};

// Create a transcription from uploaded audio file
const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file.' });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const savedFilename = req.file.filename;
    
    // Check if frontend passed a pre-transcribed text (e.g. from browser Web Speech API during live recording)
    const frontendTranscript = req.body.localTranscript;
    
    let transcriptionText = '';
    let isMock = false;

    if (aaiClient) {
      console.log(`🎙️ [AssemblyAI] Transcribing: ${originalFilename}`);
      try {
        const transcript = await aaiClient.transcripts.transcribe({
          audio: filePath
        });
        
        if (transcript.status === 'error') {
          throw new Error(transcript.error);
        }
        transcriptionText = transcript.text;
      } catch (aaiError) {
        console.error('⚠️ AssemblyAI Error:', aaiError.message);
        return res.status(500).json({ success: false, message: 'Speech-to-Text API failed', error: aaiError.message });
      }
    } else {
      isMock = true;
      console.log(`ℹ️ [Demo Mode] Transcribing: ${originalFilename}`);
      
      if (frontendTranscript && frontendTranscript.trim().length > 0) {
        console.log('✨ Incorporating high-fidelity frontend speech transcript!');
        transcriptionText = frontendTranscript;
      } else {
        const mockTexts = [
          "Welcome to the premium Speech-to-Text Hub! This transcription has been generated in Demo Mode. To experience real-time AI transcription, configure your AssemblyAI API key in the backend environment file (.env).",
          "Hello there! The microphone is working and the audio data was successfully transmitted to our Node.js and Express backend. This mock transcription proves that our complete end-to-end full-stack pipeline is 100% operational!",
          "Digital speech recognition technology uses deep neural networks to convert acoustic wave forms into digital text. By leveraging state-of-the-art transformers like AssemblyAI and OpenAI Whisper, we can achieve over ninety-five percent accuracy.",
          "This is a demonstration of our clean audio upload and recording interface. The database model is storing this metadata, the audio file is safely saved on the server, and this glassmorphic card will be persisted inside our history panel."
        ];
        transcriptionText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      }
    }

    const duration = parseFloat(req.body.duration) || Math.floor(Math.random() * 8) + 3;

    // Create the DB record, including the physical file path for audio streaming
    const record = await Transcript.create({
      text: transcriptionText,
      filename: originalFilename,
      audioPath: savedFilename,
      duration: duration,
      language: req.body.language || 'en'
    });

    res.status(201).json({
      success: true,
      message: isMock ? 'Transcription completed in Demo Mode' : 'Transcription completed successfully',
      data: record
    });

  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({ success: false, message: 'Server Error during transcription', error: error.message });
  }
};

// Delete a transcription
const deleteTranscription = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Transcript.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Transcription not found' });
    }
    
    // Try to delete physical audio file if it exists
    if (removed.audioPath) {
      const uploadDir = path.join(__dirname, '../../uploads');
      const physicalPath = path.join(uploadDir, removed.audioPath);
      if (fs.existsSync(physicalPath)) {
        fs.unlinkSync(physicalPath);
        console.log(`🗑️ Deleted local audio file: ${removed.audioPath}`);
      }
    }

    res.json({ success: true, message: 'Transcription deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error deleting transcription', error: error.message });
  }
};

module.exports = {
  getTranscriptions,
  transcribeAudio,
  deleteTranscription
};
