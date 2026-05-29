const express = require('express');
const router = express.Router();
const { register, login, googleLogin, getGoogleClientId } = require('../controllers/authController');

// Authentication API routes
router.get('/config', getGoogleClientId);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);

module.exports = router;
