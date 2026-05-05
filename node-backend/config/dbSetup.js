const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const setupDB = async () => {
    try {
        // Connect to MySQL server without specifying a database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const dbName = process.env.DB_NAME || 'payroll_system_new';
        
        console.log(`Setting up database: ${dbName}...`);
        
        // Create DB if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database \`${dbName}\` created or already exists.`);

        // Use the database
        await connection.query(`USE \`${dbName}\`;`);

        // Create admins table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table `admins` created or already exists.');

        // Create staff table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department VARCHAR(255) NOT NULL,
                basic FLOAT NOT NULL DEFAULT 0,
                hra FLOAT NOT NULL DEFAULT 0,
                da FLOAT NOT NULL DEFAULT 0,
                allowance FLOAT NOT NULL DEFAULT 0,
                pf FLOAT NOT NULL DEFAULT 0,
                tax FLOAT NOT NULL DEFAULT 0,
                gross FLOAT NOT NULL DEFAULT 0,
                net FLOAT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table `staff` created or already exists.');

        // Insert default admin if none exists
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM admins');
        if (rows[0].count === 0) {
            const bcrypt = require('bcrypt');
            const defaultPassword = await bcrypt.hash('admin123', 10);
            await connection.query('INSERT INTO admins (email, password) VALUES (?, ?)', ['admin@paynest.com', defaultPassword]);
            console.log('✅ Default admin user created (admin@paynest.com / admin123)');
        }

        await connection.end();
        console.log('Database setup completed successfully.');
    } catch (error) {
        console.error('Failed to setup database:', error.message);
        process.exit(1);
    }
};

module.exports = setupDB;
