const { pool } = require('../config/db');

class AdminModel {
    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
        return rows[0];
    }

    static async create(email, password) {
        const [result] = await pool.query(
            'INSERT INTO admins (email, password) VALUES (?, ?)',
            [email, password]
        );
        return result.insertId;
    }
}

module.exports = AdminModel;
