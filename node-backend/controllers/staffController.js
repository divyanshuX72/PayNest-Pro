const StaffModel = require('../models/staffModel');

// Determine current 6-month cycle: Jan-Jun or Jul-Dec
const getCurrentCycle = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month <= 6 ? `${year}-H1` : `${year}-H2`;
};

const calculatePayroll = (data, existingStaff = null) => {
    const basic = parseFloat(data.basic) || 0;
    const hra = parseFloat(data.hra) || 0;
    const da = parseFloat(data.da) || 0;
    const allowance = parseFloat(data.allowance) || 0;
    const pf = parseFloat(data.pf) || 0;
    const tax = parseFloat(data.tax) || 0;
    const working_days = parseInt(data.working_days) || 30;
    
    // Support either cl_taken or cl_used naming from different frontend parts
    const cl_taken = parseInt(data.cl_taken) || parseInt(data.cl_used) || 0;
    const medical_taken = parseInt(data.medical_taken) || parseInt(data.medical_used) || 0;
    const personal_leave = parseInt(data.personal_leave) || 0;

    // Gross Salary = Basic + HRA + DA + Allowance
    const gross = basic + hra + da + allowance;

    // Per Day Salary = Gross / WorkingDays
    const per_day = working_days > 0 ? gross / working_days : 0;

    // LEAVE QUOTA RULES
    const cl_quota = 8;
    const medical_quota = 2;

    const extra_cl = Math.max(0, cl_taken - cl_quota);
    const extra_medical = Math.max(0, medical_taken - medical_quota);
    
    // Unpaid Leaves = Personal leave + Extra CL beyond quota + Extra medical beyond quota
    const unpaid_leaves = personal_leave + extra_cl + extra_medical;

    // Deduction = Per Day Salary × Unpaid Leaves
    const deduction = per_day * unpaid_leaves;

    // Final Salary = Gross - Deduction - PF - Tax
    const final_salary = gross - deduction - pf - tax;

    return {
        basic, hra, da, allowance, pf, tax, gross,
        working_days, 
        cl_used: cl_taken, 
        medical_used: medical_taken, 
        personal_leave,
        deduction: Math.round(deduction * 100) / 100,
        final_salary: Math.round(final_salary * 100) / 100
    };
};

exports.getAllStaff = async (req, res, next) => {
    try {
        const staffList = await StaffModel.findAll();
        res.json(staffList);
    } catch (error) { next(error); }
};

exports.getStaffById = async (req, res, next) => {
    try {
        const staff = await StaffModel.findById(req.params.id);
        if (!staff) return res.status(404).json({ error: 'Staff not found' });
        res.json(staff);
    } catch (error) { next(error); }
};

// Search by employee_id (e.g. EMP-001)
exports.searchByEmployeeId = async (req, res, next) => {
    try {
        const staff = await StaffModel.findByEmployeeId(req.params.empId);
        if (!staff) return res.status(404).json({ error: 'No staff found with ID: ' + req.params.empId });
        res.json(staff);
    } catch (error) { next(error); }
};

// Get next available employee ID
exports.getNextId = async (req, res, next) => {
    try {
        const nextId = await StaffModel.getNextEmployeeId();
        res.json({ nextId });
    } catch (error) { next(error); }
};

exports.createStaff = async (req, res, next) => {
    try {
        const { employee_id, name, role, department, section, qualification, salary_type, joining_date, status, month } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }
        const calculated = calculatePayroll(req.body);
        const newStaffId = await StaffModel.create({ employee_id, name, role, department, section, qualification, salary_type, joining_date, status, month, ...calculated });
        res.status(201).json({ message: 'Staff added successfully', id: newStaffId, employee_id });
    } catch (error) { next(error); }
};

exports.updateStaff = async (req, res, next) => {
    try {
        const { employee_id, name, role, department, section, qualification, salary_type, joining_date, status, month } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }
        const existingStaff = await StaffModel.findById(req.params.id);
        const calculated = calculatePayroll(req.body, existingStaff);
        const affectedRows = await StaffModel.update(req.params.id, { employee_id, name, role, department, section, qualification, salary_type, joining_date, status, month, ...calculated });
        if (affectedRows === 0) return res.status(404).json({ error: 'Staff not found' });
        res.json({ message: 'Staff updated successfully' });
    } catch (error) { next(error); }
};

exports.deleteStaff = async (req, res, next) => {
    try {
        const affectedRows = await StaffModel.delete(req.params.id);
        if (affectedRows === 0) return res.status(404).json({ error: 'Staff not found' });
        res.json({ message: 'Staff deleted successfully' });
    } catch (error) { next(error); }
};

exports.deleteAllStaff = async (req, res, next) => {
    try {
        await StaffModel.deleteAll();
        res.json({ message: 'All staff data deleted successfully' });
    } catch (error) { next(error); }
};

exports.paySalary = async (req, res, next) => {
    try {
        const affectedRows = await StaffModel.paySalary(req.params.id);
        if (affectedRows === 0) return res.status(404).json({ error: 'Staff not found' });
        res.json({ message: 'Salary paid successfully' });
    } catch (error) { next(error); }
};

exports.payBulkSalary = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No staff IDs provided' });
        }
        const affectedRows = await StaffModel.payBulkSalary(ids);
        res.json({ message: `${affectedRows} salaries paid successfully` });
    } catch (error) { next(error); }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await StaffModel.getDashboardStats();
        res.json(stats);
    } catch (error) { next(error); }
};
