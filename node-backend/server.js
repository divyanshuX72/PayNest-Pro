const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const setupDB = require('./config/dbSetup');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    exposedHeaders: ['Content-Disposition']
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Static folder for frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf', pdfRoutes);

// Error Handling Middleware (must be after routes)
app.use(errorHandler);

// Define PORT
const PORT = process.env.PORT || 5000;

// Connect to DB and Start Server
const startServer = async () => {
    try {
        // Run database setup script (creates DB & tables if missing)
        await setupDB();

        // Connect Database pool
        await connectDB();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`👉 Access Frontend at http://localhost:${PORT}/login.html`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
// Trigger nodemon restart
