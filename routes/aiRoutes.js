const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all AI routes with JWT authentication
router.use(authMiddleware);

// POST /api/ai/chat
router.post('/chat', aiController.handleChat);

module.exports = router;
