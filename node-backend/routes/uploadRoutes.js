const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

// Setup multer (in-memory storage for processing)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, upload.single('file'), uploadController.uploadExcel);

module.exports = router;
