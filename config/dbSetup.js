const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const setupDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const dbName = process.env.DB_NAME || 'payroll_db_2';

        console.log(`Setting up database: ${dbName}...`);

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database \`${dbName}\` created or already exists.`);

        await connection.query(`USE \`${dbName}\`;`);

        // 1. Create admins table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) DEFAULT '',
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(100) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table `admins` created.');

        // 2. Create staff table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100) DEFAULT '',
                department VARCHAR(255) NOT NULL,
                section VARCHAR(100) DEFAULT '',
                qualification VARCHAR(255) DEFAULT '',
                salary_type VARCHAR(50) DEFAULT 'Monthly',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Add qualification column if missing
        try { await connection.query('ALTER TABLE staff ADD COLUMN qualification VARCHAR(255) DEFAULT \'\''); } catch (e) {}
        console.log('Table `staff` created.');

        // 3. Create payroll table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payroll (
                id INT AUTO_INCREMENT PRIMARY KEY,
                staff_id INT NOT NULL,
                payroll_month VARCHAR(50) NOT NULL,
                payroll_year INT NOT NULL,
                basic FLOAT NOT NULL DEFAULT 0,
                hra FLOAT NOT NULL DEFAULT 0,
                da FLOAT NOT NULL DEFAULT 0,
                allowance FLOAT NOT NULL DEFAULT 0,
                pf FLOAT NOT NULL DEFAULT 0,
                tax FLOAT NOT NULL DEFAULT 0,
                working_days INT DEFAULT 30,
                cl_used INT DEFAULT 0,
                medical_used INT DEFAULT 0,
                personal_leave INT DEFAULT 0,
                gross_salary FLOAT NOT NULL DEFAULT 0,
                deduction FLOAT DEFAULT 0,
                final_salary FLOAT DEFAULT 0,
                payment_status VARCHAR(20) DEFAULT 'pending',
                paid_date DATE DEFAULT NULL,
                paid_time TIME DEFAULT NULL,
                transaction_id VARCHAR(100) DEFAULT NULL,
                slip_generated BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
            );
        `);
        
        try { await connection.query('ALTER TABLE payroll ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL'); } catch (e) {}
        try { await connection.query('ALTER TABLE payroll ADD COLUMN slip_generated BOOLEAN DEFAULT FALSE'); } catch (e) {}

        console.log('Table `payroll` verified/created.');

        // 3.5. Create salary_slips table (upgraded with slip_id and verification)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS salary_slips (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slip_id VARCHAR(100) UNIQUE NOT NULL,
                verification_token VARCHAR(100) UNIQUE NOT NULL,
                staff_id INT NOT NULL,
                payroll_id INT NOT NULL,
                pdf_path VARCHAR(500) NOT NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
                FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE
            );
        `);
        // Add new columns if table already existed without them
        try { await connection.query('ALTER TABLE salary_slips ADD COLUMN slip_id VARCHAR(100) UNIQUE NOT NULL AFTER id'); } catch (e) {}
        try { await connection.query('ALTER TABLE salary_slips ADD COLUMN verification_token VARCHAR(100) UNIQUE NOT NULL AFTER slip_id'); } catch (e) {}
        console.log('Table `salary_slips` verified/created.');

        // 4. Create admin_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                action VARCHAR(255) NOT NULL,
                ip_address VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            );
        `);
        console.log('Table `admin_logs` created.');

        // 5. Create activity_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                activity_type VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                staff_id INT DEFAULT NULL,
                department VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
            );
        `);
        console.log('Table `activity_logs` created.');

        // 6. Create ai_logs table for AI Assistant audit trail
        await connection.query(`
            CREATE TABLE IF NOT EXISTS ai_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                question TEXT NOT NULL,
                detected_intent VARCHAR(100) DEFAULT '',
                generated_sql TEXT DEFAULT '',
                execution_time_ms INT DEFAULT 0,
                response_type VARCHAR(50) DEFAULT '',
                success BOOLEAN DEFAULT TRUE,
                ip_address VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
            );
        `);
        console.log('Table `ai_logs` created.');

        // Insert default admin if none exists
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM admins');
        if (rows[0].count === 0) {
            const bcrypt = require('bcrypt');
            const defaultPassword = await bcrypt.hash('admin123', 10);
            await connection.query('INSERT INTO admins (email, password) VALUES (?, ?)', ['admin@paynest.com', defaultPassword]);
            console.log('Default admin created (admin@paynest.com / admin123)');
        }

        await connection.end();
        console.log('Database setup completed successfully.');
    } catch (error) {
        console.error('Failed to setup database:', error.message);
        process.exit(1);
    }
};

module.exports = setupDB;

if (require.main === module) {
    setupDB();
}
