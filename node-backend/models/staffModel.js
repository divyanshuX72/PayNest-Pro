const { pool } = require('../config/db');

class StaffModel {
    static async findAll() {
        const [rows] = await pool.query(`
            SELECT 
                p.id as id,
                s.id as staff_id,
                s.employee_id,
                s.name,
                s.role,
                s.department,
                s.section,
                s.salary_type,
                p.payroll_month as month,
                p.basic,
                p.hra,
                p.da,
                p.allowance,
                p.pf,
                p.tax,
                p.working_days,
                p.cl_used as cl_taken,
                p.medical_used as medical_taken,
                p.personal_leave,
                p.cl_used,
                p.medical_used,
                p.gross_salary as gross,
                p.deduction,
                p.final_salary,
                p.payment_status,
                p.paid_date,
                p.paid_time,
                p.created_at
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            ORDER BY p.id DESC
        `);
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT 
                p.id as id,
                s.id as staff_id,
                s.employee_id,
                s.name,
                s.role,
                s.department,
                s.section,
                s.salary_type,
                p.payroll_month as month,
                p.basic,
                p.hra,
                p.da,
                p.allowance,
                p.pf,
                p.tax,
                p.working_days,
                p.cl_used as cl_taken,
                p.medical_used as medical_taken,
                p.personal_leave,
                p.cl_used,
                p.medical_used,
                p.gross_salary as gross,
                p.deduction,
                p.final_salary,
                p.payment_status,
                p.paid_date,
                p.paid_time,
                p.created_at
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    }

    static async findByEmployeeId(empId) {
        const [rows] = await pool.query(`
            SELECT * FROM staff WHERE employee_id = ?
        `, [empId]);
        return rows[0];
    }

    static async findPayrollByStaffAndMonth(staffId, month, year) {
        const [rows] = await pool.query(`
            SELECT * FROM payroll WHERE staff_id = ? AND payroll_month = ? AND payroll_year = ?
        `, [staffId, month, year]);
        return rows[0];
    }

    static async getNextEmployeeId() {
        const [rows] = await pool.query("SELECT employee_id FROM staff WHERE employee_id LIKE 'EMP-%' ORDER BY id DESC LIMIT 1");
        if (rows.length === 0) return 'EMP-001';
        const last = rows[0].employee_id;
        const num = parseInt(last.replace('EMP-', '')) || 0;
        return 'EMP-' + String(num + 1).padStart(3, '0');
    }

    static async create(d) {
        if (!d.employee_id || d.employee_id.trim() === '') {
            d.employee_id = await this.getNextEmployeeId();
        }

        // 1. Create or get staff
        let staffId;
        const [existing] = await pool.query('SELECT id FROM staff WHERE employee_id = ?', [d.employee_id]);
        
        if (existing.length > 0) {
            staffId = existing[0].id;
            // Update staff details
            await pool.query(`
                UPDATE staff SET name=?, role=?, department=?, section=?, salary_type=? WHERE id=?
            `, [d.name, d.role || '', d.department, d.section || '', d.salary_type || 'Monthly', staffId]);
        } else {
            const [result] = await pool.query(`
                INSERT INTO staff (employee_id, name, role, department, section, salary_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [d.employee_id, d.name, d.role || '', d.department, d.section || '', d.salary_type || 'Monthly']);
            staffId = result.insertId;
        }

        const currentYear = new Date().getFullYear();

        // 2. Check if payroll exists for this month
        const [payrolls] = await pool.query(`
            SELECT id FROM payroll WHERE staff_id = ? AND payroll_month = ? AND payroll_year = ?
        `, [staffId, d.month || 'Jan', currentYear]);

        const cl = d.cl_taken || d.cl_used || 0;
        const med = d.medical_taken || d.medical_used || 0;

        if (payrolls.length > 0) {
            // Update payroll
            await pool.query(`
                UPDATE payroll SET 
                basic=?, hra=?, da=?, allowance=?, pf=?, tax=?, working_days=?, 
                cl_used=?, medical_used=?, personal_leave=?, gross_salary=?, deduction=?, final_salary=?
                WHERE id=?
            `, [
                d.basic || 0, d.hra || 0, d.da || 0, d.allowance || 0, d.pf || 0, d.tax || 0,
                d.working_days || 30, cl, med, d.personal_leave || 0,
                d.gross || 0, d.deduction || 0, d.final_salary || 0, payrolls[0].id
            ]);
            return payrolls[0].id;
        } else {
            // Create payroll
            const [pResult] = await pool.query(`
                INSERT INTO payroll (
                    staff_id, payroll_month, payroll_year, basic, hra, da, allowance, 
                    pf, tax, working_days, cl_used, medical_used, personal_leave, 
                    gross_salary, deduction, final_salary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                staffId, d.month || 'Jan', currentYear,
                d.basic || 0, d.hra || 0, d.da || 0, d.allowance || 0,
                d.pf || 0, d.tax || 0, d.working_days || 30, cl, med, d.personal_leave || 0,
                d.gross || 0, d.deduction || 0, d.final_salary || 0
            ]);
            return pResult.insertId;
        }
    }

    static async update(payrollId, d) {
        // Find payroll record to get staff_id
        const [payrolls] = await pool.query('SELECT staff_id FROM payroll WHERE id = ?', [payrollId]);
        if (payrolls.length === 0) return 0;
        const staffId = payrolls[0].staff_id;

        // Update staff
        const empId = d.employee_id && d.employee_id.trim() !== '' ? d.employee_id : await this.getNextEmployeeId();
        await pool.query(`
            UPDATE staff SET employee_id=?, name=?, role=?, department=?, section=?, salary_type=? WHERE id=?
        `, [empId, d.name, d.role || '', d.department, d.section || '', d.salary_type || 'Monthly', staffId]);

        const cl = d.cl_taken || d.cl_used || 0;
        const med = d.medical_taken || d.medical_used || 0;

        // Update payroll
        const [result] = await pool.query(`
            UPDATE payroll SET 
            payroll_month=?, basic=?, hra=?, da=?, allowance=?, pf=?, tax=?, working_days=?, 
            cl_used=?, medical_used=?, personal_leave=?, gross_salary=?, deduction=?, final_salary=?
            WHERE id=?
        `, [
            d.month || 'Jan', d.basic || 0, d.hra || 0, d.da || 0, d.allowance || 0, d.pf || 0, d.tax || 0,
            d.working_days || 30, cl, med, d.personal_leave || 0,
            d.gross || 0, d.deduction || 0, d.final_salary || 0, payrollId
        ]);
        
        return result.affectedRows;
    }

    static async delete(payrollId) {
        const [result] = await pool.query('DELETE FROM payroll WHERE id = ?', [payrollId]);
        return result.affectedRows;
    }

    static async deleteAll() {
        await pool.query('TRUNCATE TABLE payroll');
        const [result] = await pool.query('TRUNCATE TABLE staff');
        return result.affectedRows;
    }

    static async paySalary(payrollId) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0];
        const [result] = await pool.query(
            "UPDATE payroll SET payment_status='paid', paid_date=?, paid_time=? WHERE id=?",
            [date, time, payrollId]
        );
        return result.affectedRows;
    }

    static async payBulkSalary(payrollIds) {
        if (!payrollIds || payrollIds.length === 0) return 0;
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0];
        const placeholders = payrollIds.map(() => '?').join(',');
        const [result] = await pool.query(
            `UPDATE payroll SET payment_status='paid', paid_date=?, paid_time=? WHERE id IN (${placeholders})`,
            [date, time, ...payrollIds]
        );
        return result.affectedRows;
    }

    static async getDashboardStats() {
        const [staffCount] = await pool.query('SELECT COUNT(*) as total FROM staff');
        const [salaryPayout] = await pool.query('SELECT SUM(final_salary) as totalPayout FROM payroll');
        const [departmentCount] = await pool.query('SELECT COUNT(DISTINCT department) as totalDeps FROM staff');
        const [pendingPayroll] = await pool.query('SELECT COUNT(*) as count FROM payroll WHERE payment_status="pending" OR payment_status IS NULL');
        const [paidPayroll] = await pool.query('SELECT COUNT(*) as count FROM payroll WHERE payment_status="paid"');

        // Section distribution
        const [sectionData] = await pool.query(`
            SELECT 
                COALESCE(NULLIF(TRIM(s.section), ''), NULLIF(TRIM(s.department), ''), 'Not Specified') as section_name,
                SUM(p.final_salary) as total_salary,
                COUNT(DISTINCT s.id) as staff_count
            FROM staff s
            LEFT JOIN payroll p ON s.id = p.staff_id
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
                ROUND(SUM(gross_salary), 2) as totalGross
            FROM payroll
        `);

        // Recent activities
        const [recentlyAdded] = await pool.query(`
            SELECT p.id, s.name, s.role, s.department, s.section, p.final_salary, p.created_at 
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            ORDER BY p.created_at DESC, p.id DESC LIMIT 5
        `);

        const [recentlyPaid] = await pool.query(`
            SELECT p.id, s.name, s.department, p.final_salary, p.paid_date, p.paid_time 
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            WHERE p.payment_status='paid' AND p.paid_date IS NOT NULL 
            ORDER BY p.paid_date DESC, p.paid_time DESC LIMIT 5
        `);

        const [highestSalary] = await pool.query(`
            SELECT s.name, s.department, p.final_salary 
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            ORDER BY p.final_salary DESC LIMIT 3
        `);

        const [highestDeduction] = await pool.query(`
            SELECT s.name, s.department, p.deduction, (p.cl_used + p.medical_used + p.personal_leave) as unpaid_leaves 
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            WHERE p.deduction > 0 ORDER BY p.deduction DESC LIMIT 3
        `);

        const [mostLeaves] = await pool.query(`
            SELECT s.name, s.department, (p.cl_used + p.medical_used + p.personal_leave) as total_leaves
            FROM payroll p
            JOIN staff s ON p.staff_id = s.id
            ORDER BY total_leaves DESC LIMIT 3
        `);

        const today = new Date().toISOString().split('T')[0];
        const [todayAdded] = await pool.query(`SELECT COUNT(*) as count FROM payroll WHERE DATE(created_at) = ?`, [today]);
        const [todayPaid] = await pool.query(`SELECT COUNT(*) as count FROM payroll WHERE paid_date = ?`, [today]);

        const [monthlyTrend] = await pool.query(`
            SELECT 
                payroll_month as month,
                ROUND(SUM(final_salary), 2) as totalPayout
            FROM payroll
            WHERE payroll_month IS NOT NULL AND TRIM(payroll_month) != ''
            GROUP BY payroll_month
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
