const { pool } = require('../config/db');

class StaffModel {
    static async findAll() {
        const [rows] = await pool.query('SELECT * FROM staff ORDER BY id DESC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(staffData) {
        const { name, department, basic, hra, da, allowance, pf, tax, gross, net } = staffData;
        const [result] = await pool.query(
            `INSERT INTO staff 
            (name, department, basic, hra, da, allowance, pf, tax, gross, net) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, department, basic, hra, da, allowance, pf, tax, gross, net]
        );
        return result.insertId;
    }

    static async update(id, staffData) {
        const { name, department, basic, hra, da, allowance, pf, tax, gross, net } = staffData;
        const [result] = await pool.query(
            `UPDATE staff SET 
            name=?, department=?, basic=?, hra=?, da=?, allowance=?, pf=?, tax=?, gross=?, net=? 
            WHERE id=?`,
            [name, department, basic, hra, da, allowance, pf, tax, gross, net, id]
        );
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM staff WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async getDashboardStats() {
        const [staffCount] = await pool.query('SELECT COUNT(*) as total FROM staff');
        const [salaryPayout] = await pool.query('SELECT SUM(net) as totalPayout FROM staff');
        const [departmentCount] = await pool.query('SELECT COUNT(DISTINCT department) as totalDeps FROM staff');
        
        return {
            totalStaff: staffCount[0].total || 0,
            totalPayout: salaryPayout[0].totalPayout || 0,
            totalDepartments: departmentCount[0].totalDeps || 0
        };
    }
}

module.exports = StaffModel;
