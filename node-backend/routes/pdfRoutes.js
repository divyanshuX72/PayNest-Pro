const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:id', authMiddleware, pdfController.generateSlip);

module.exports = router;
