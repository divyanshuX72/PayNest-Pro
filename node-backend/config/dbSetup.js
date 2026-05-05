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

        const dbName = process.env.DB_NAME || 'payroll_system_new';
        
        console.log(`Setting up database: ${dbName}...`);
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database \`${dbName}\` created or already exists.`);

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
                employee_id VARCHAR(50) DEFAULT '',
                name VARCHAR(255) NOT NULL,
                role VARCHAR(100) DEFAULT '',
                department VARCHAR(255) NOT NULL,
                section VARCHAR(100) DEFAULT '',
                level VARCHAR(100) DEFAULT '',
                qualification VARCHAR(100) DEFAULT '',
                salary_type VARCHAR(50) DEFAULT 'Monthly',
                joining_date DATE DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'Active',
                basic FLOAT NOT NULL DEFAULT 0,
                hra FLOAT NOT NULL DEFAULT 0,
                da FLOAT NOT NULL DEFAULT 0,
                allowance FLOAT NOT NULL DEFAULT 0,
                pf FLOAT NOT NULL DEFAULT 0,
                tax FLOAT NOT NULL DEFAULT 0,
                gross FLOAT NOT NULL DEFAULT 0,
                net FLOAT NOT NULL DEFAULT 0,
                month VARCHAR(20) DEFAULT '',
                working_days INT DEFAULT 30,
                cl_taken INT DEFAULT 0,
                medical_taken INT DEFAULT 0,
                personal_leave INT DEFAULT 0,
                cl_quota INT DEFAULT 8,
                cl_used INT DEFAULT 0,
                medical_quota INT DEFAULT 2,
                medical_used INT DEFAULT 0,
                unpaid_leaves INT DEFAULT 0,
                deduction FLOAT DEFAULT 0,
                final_salary FLOAT DEFAULT 0,
                quota_cycle VARCHAR(20) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table `staff` created or already exists.');

        // Migration: add new columns if table already existed
        const newCols = [
            { name: 'employee_id', def: "VARCHAR(50) DEFAULT ''" },
            { name: 'role', def: "VARCHAR(100) DEFAULT ''" },
            { name: 'section', def: "VARCHAR(100) DEFAULT ''" },
            { name: 'level', def: "VARCHAR(100) DEFAULT ''" },
            { name: 'qualification', def: "VARCHAR(100) DEFAULT ''" },
            { name: 'salary_type', def: "VARCHAR(50) DEFAULT 'Monthly'" },
            { name: 'joining_date', def: 'DATE DEFAULT NULL' },
            { name: 'status', def: "VARCHAR(20) DEFAULT 'Active'" },
            { name: 'working_days', def: 'INT DEFAULT 30' },
            { name: 'cl_taken', def: 'INT DEFAULT 0' },
            { name: 'medical_taken', def: 'INT DEFAULT 0' },
            { name: 'personal_leave', def: 'INT DEFAULT 0' },
            { name: 'cl_quota', def: 'INT DEFAULT 8' },
            { name: 'cl_used', def: 'INT DEFAULT 0' },
            { name: 'medical_quota', def: 'INT DEFAULT 2' },
            { name: 'medical_used', def: 'INT DEFAULT 0' },
            { name: 'unpaid_leaves', def: 'INT DEFAULT 0' },
            { name: 'deduction', def: 'FLOAT DEFAULT 0' },
            { name: 'final_salary', def: 'FLOAT DEFAULT 0' },
            { name: 'quota_cycle', def: "VARCHAR(20) DEFAULT ''" },
            { name: 'month', def: "VARCHAR(20) DEFAULT ''" }
        ];
        for (const col of newCols) {
            try {
                await connection.query(`ALTER TABLE staff ADD COLUMN ${col.name} ${col.def}`);
                console.log(`Column '${col.name}' added.`);
            } catch (e) { /* already exists */ }
        }

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
