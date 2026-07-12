const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all AI routes with JWT authentication
router.use(authMiddleware);

// POST /api/ai/chat — Main AI chat endpoint
router.post('/chat', aiController.handleChat);

// GET /api/ai/suggestions — Context-aware suggested questions
router.get('/suggestions', aiController.getSuggestions);

// DELETE /api/ai/history — Clear conversation memory
router.delete('/history', aiController.clearHistory);

// GET /api/ai/logs — AI audit logs
router.get('/logs', aiController.getLogs);

module.exports = router;
