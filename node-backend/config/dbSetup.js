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
                salary_type VARCHAR(50) DEFAULT 'Monthly',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
            );
        `);
        console.log('Table `payroll` created.');

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

