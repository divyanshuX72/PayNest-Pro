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

    static async findByEmployeeId(empId) {
        const [rows] = await pool.query('SELECT * FROM staff WHERE employee_id = ?', [empId]);
        return rows[0];
    }

    static async getNextEmployeeId() {
        const [rows] = await pool.query("SELECT employee_id FROM staff WHERE employee_id LIKE 'EMP-%' ORDER BY id DESC LIMIT 1");
        if (rows.length === 0) return 'EMP-001';
        const last = rows[0].employee_id; // e.g. "EMP-042"
        const num = parseInt(last.replace('EMP-', '')) || 0;
        return 'EMP-' + String(num + 1).padStart(3, '0');
    }

    static async create(d) {
        const [result] = await pool.query(
            `INSERT INTO staff 
            (employee_id, name, role, department, section, level, qualification, salary_type, joining_date, status,
             basic, hra, da, allowance, pf, tax, gross, net, month,
             working_days, cl_taken, medical_taken, personal_leave,
             cl_quota, cl_used, medical_quota, medical_used,
             unpaid_leaves, deduction, final_salary, quota_cycle)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [d.employee_id || '', d.name, d.role || '', d.department, d.section || '', d.level || '', d.qualification || '', d.salary_type || 'Monthly',
            d.joining_date || null, d.status || 'Active',
            d.basic, d.hra, d.da, d.allowance, d.pf, d.tax, d.gross, d.net, d.month || '',
            d.working_days || 30, d.cl_taken || 0, d.medical_taken || 0, d.personal_leave || 0,
            d.cl_quota || 8, d.cl_used || 0, d.medical_quota || 2, d.medical_used || 0,
            d.unpaid_leaves || 0, d.deduction || 0, d.final_salary || 0, d.quota_cycle || '']
        );
        return result.insertId;
    }

    static async update(id, d) {
        const [result] = await pool.query(
            `UPDATE staff SET 
            employee_id=?, name=?, role=?, department=?, section=?, level=?, qualification=?, salary_type=?, joining_date=?, status=?,
            basic=?, hra=?, da=?, allowance=?, pf=?, tax=?, gross=?, net=?, month=?,
            working_days=?, cl_taken=?, medical_taken=?, personal_leave=?,
            cl_quota=?, cl_used=?, medical_quota=?, medical_used=?,
            unpaid_leaves=?, deduction=?, final_salary=?, quota_cycle=?
            WHERE id=?`,
            [d.employee_id || '', d.name, d.role || '', d.department, d.section || '', d.level || '', d.qualification || '', d.salary_type || 'Monthly',
            d.joining_date || null, d.status || 'Active',
            d.basic, d.hra, d.da, d.allowance, d.pf, d.tax, d.gross, d.net, d.month || '',
            d.working_days || 30, d.cl_taken || 0, d.medical_taken || 0, d.personal_leave || 0,
            d.cl_quota || 8, d.cl_used || 0, d.medical_quota || 2, d.medical_used || 0,
            d.unpaid_leaves || 0, d.deduction || 0, d.final_salary || 0, d.quota_cycle || '', id]
        );
        return result.affectedRows;
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM staff WHERE id = ?', [id]);
        return result.affectedRows;
    }

    static async deleteAll() {
        const [result] = await pool.query('TRUNCATE TABLE staff');
        return result.affectedRows;
    }

    static async paySalary(id) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0];
        const [result] = await pool.query(
            `UPDATE staff SET payment_status='paid', paid_date=?, paid_time=? WHERE id=?`,
            [date, time, id]
        );
        return result.affectedRows;
    }

    static async payBulkSalary(ids) {
        if (!ids || ids.length === 0) return 0;
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0];
        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.query(
            `UPDATE staff SET payment_status='paid', paid_date=?, paid_time=? WHERE id IN (${placeholders})`,
            [date, time, ...ids]
        );
        return result.affectedRows;
    }

    static async getDashboardStats() {
        const [staffCount] = await pool.query('SELECT COUNT(*) as total FROM staff');
        const [salaryPayout] = await pool.query('SELECT SUM(final_salary) as totalPayout FROM staff');
        const [departmentCount] = await pool.query('SELECT COUNT(DISTINCT department) as totalDeps FROM staff');
        const [pendingPayroll] = await pool.query('SELECT COUNT(*) as count FROM staff WHERE payment_status="pending" OR payment_status IS NULL');
        const [paidPayroll] = await pool.query('SELECT COUNT(*) as count FROM staff WHERE payment_status="paid"');

        // Section distribution (for pie chart)
        const [sectionData] = await pool.query(`
            SELECT 
                COALESCE(NULLIF(TRIM(section), ''), NULLIF(TRIM(department), ''), 'Not Specified') as section_name,
                SUM(final_salary) as total_salary,
                COUNT(*) as staff_count
            FROM staff 
            GROUP BY section_name
            ORDER BY total_salary DESC
        `);

        // Salary breakdown totals
        const [salaryBreakdown] = await pool.query(`
            SELECT 
                ROUND(SUM(basic), 2) as totalBasic,
                ROUND(SUM(hra), 2) as totalHRA,
                ROUND(SUM(da), 2) as totalDA,
                ROUND(SUM(allowance), 2) as totalAllowance,
                ROUND(SUM(pf), 2) as totalPF,
                ROUND(SUM(tax), 2) as totalTax,
                ROUND(SUM(deduction), 2) as totalDeduction,
                ROUND(SUM(gross), 2) as totalGross
            FROM staff
        `);

        // Recent activities from database
        const [recentlyAdded] = await pool.query(`
            SELECT id, name, role, department, section, final_salary, created_at 
            FROM staff ORDER BY created_at DESC, id DESC LIMIT 5
        `);

        const [recentlyPaid] = await pool.query(`
            SELECT id, name, department, final_salary, paid_date, paid_time 
            FROM staff WHERE payment_status='paid' AND paid_date IS NOT NULL 
            ORDER BY paid_date DESC, paid_time DESC LIMIT 5
        `);

        const [highestSalary] = await pool.query(`
            SELECT name, department, final_salary FROM staff ORDER BY final_salary DESC LIMIT 3
        `);

        const [highestDeduction] = await pool.query(`
            SELECT name, department, deduction, unpaid_leaves FROM staff 
            WHERE deduction > 0 ORDER BY deduction DESC LIMIT 3
        `);

        const [mostLeaves] = await pool.query(`
            SELECT name, department, (cl_taken + medical_taken + personal_leave) as total_leaves,
                   unpaid_leaves FROM staff 
            ORDER BY total_leaves DESC LIMIT 3
        `);

        // Today's stats
        const today = new Date().toISOString().split('T')[0];
        const [todayAdded] = await pool.query(`SELECT COUNT(*) as count FROM staff WHERE DATE(created_at) = ?`, [today]);
        const [todayPaid] = await pool.query(`SELECT COUNT(*) as count FROM staff WHERE paid_date = ?`, [today]);

        // Monthly salary trend
        const [monthlyTrend] = await pool.query(`
            SELECT 
                month,
                ROUND(SUM(final_salary), 2) as totalPayout
            FROM staff
            WHERE month IS NOT NULL AND TRIM(month) != ''
            GROUP BY month
        `);

        return {
            totalStaff: staffCount[0].total || 0,
            totalPayout: salaryPayout[0].totalPayout || 0,
            totalDepartments: departmentCount[0].totalDeps || 0,
            pendingPayroll: pendingPayroll[0].count || 0,
            paidPayroll: paidPayroll[0].count || 0,
            sectionDistribution: sectionData || [],
            salaryBreakdown: salaryBreakdown[0] || {},
            monthlyTrend: monthlyTrend || [],
            recentlyAdded: recentlyAdded || [],
            recentlyPaid: recentlyPaid || [],
            highestSalary: highestSalary || [],
            highestDeduction: highestDeduction || [],
            mostLeaves: mostLeaves || [],
            todayAdded: todayAdded[0].count || 0,
            todayPaid: todayPaid[0].count || 0
        };
    }
}

module.exports = StaffModel;
