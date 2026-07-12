const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');

// Public verification endpoint (no auth required)
router.get('/verify/:token', pdfController.verifySlip);

// Protected PDF download
router.get('/:id', authMiddleware, pdfController.generateSlip);

module.exports = router;
