const StaffModel = require('../models/staffModel');

// Determine current 6-month cycle: Jan-Jun or Jul-Dec
const getCurrentCycle = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month <= 6 ? `${year}-H1` : `${year}-H2`;
};

// Core salary + leave calculation
const calculatePayroll = (data, existingStaff = null) => {
    const basic = parseFloat(data.basic) || 0;
    const hra = parseFloat(data.hra) || 0;
    const da = parseFloat(data.da) || 0;
    const allowance = parseFloat(data.allowance) || 0;
    const pf = parseFloat(data.pf) || 0;
    const tax = parseFloat(data.tax) || 0;
    const working_days = parseInt(data.working_days) || 30;
    const cl_taken = parseInt(data.cl_taken) || 0;
    const medical_taken = parseInt(data.medical_taken) || 0;
    const personal_leave = parseInt(data.personal_leave) || 0;

    const gross = basic + hra + da + allowance;
    const net = gross - pf - tax;

    let cl_quota = parseInt(data.cl_quota) || 8;
    let medical_quota = parseInt(data.medical_quota) || 2;

    const currentCycle = getCurrentCycle();
    let prev_cl_used = 0;
    let prev_medical_used = 0;

    if (existingStaff && existingStaff.quota_cycle === currentCycle) {
        prev_cl_used = (parseInt(existingStaff.cl_used) || 0) - (parseInt(existingStaff.cl_taken) || 0);
        prev_medical_used = (parseInt(existingStaff.medical_used) || 0) - (parseInt(existingStaff.medical_taken) || 0);
    }

    const cl_used = Math.max(0, prev_cl_used) + cl_taken;
    const medical_used = Math.max(0, prev_medical_used) + medical_taken;

    const paid_cl = Math.min(cl_taken, Math.max(0, cl_quota - Math.max(0, prev_cl_used)));
    const paid_medical = Math.min(medical_taken, Math.max(0, medical_quota - Math.max(0, prev_medical_used)));

    const extra_cl = Math.max(0, cl_taken - paid_cl);
    const extra_medical = Math.max(0, medical_taken - paid_medical);
    const unpaid_leaves = extra_cl + extra_medical + personal_leave;

    const per_day = working_days > 0 ? gross / working_days : 0;
    const deduction = per_day * unpaid_leaves;
    const final_salary = gross - deduction - pf - tax;

    return {
        basic, hra, da, allowance, pf, tax, gross, net,
        working_days, cl_taken, medical_taken, personal_leave,
        cl_quota, cl_used, medical_quota, medical_used,
        unpaid_leaves,
        deduction: Math.round(deduction * 100) / 100,
        final_salary: Math.round(final_salary * 100) / 100,
        quota_cycle: currentCycle
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
        const { employee_id, name, role, department, qualification, salary_type, joining_date, status, month } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }
        const calculated = calculatePayroll(req.body);
        const newStaffId = await StaffModel.create({ employee_id, name, role, department, qualification, salary_type, joining_date, status, month, ...calculated });
        res.status(201).json({ message: 'Staff added successfully', id: newStaffId, employee_id });
    } catch (error) { next(error); }
};

exports.updateStaff = async (req, res, next) => {
    try {
        const { employee_id, name, role, department, qualification, salary_type, joining_date, status, month } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }
        const existingStaff = await StaffModel.findById(req.params.id);
        const calculated = calculatePayroll(req.body, existingStaff);
        const affectedRows = await StaffModel.update(req.params.id, { employee_id, name, role, department, qualification, salary_type, joining_date, status, month, ...calculated });
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

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await StaffModel.getDashboardStats();
        res.json(stats);
    } catch (error) { next(error); }
};
