const StaffModel = require('../models/staffModel');

// Helper to calculate salary
const calculateSalary = (data) => {
    const basic = parseFloat(data.basic) || 0;
    const hra = parseFloat(data.hra) || 0;
    const da = parseFloat(data.da) || 0;
    const allowance = parseFloat(data.allowance) || 0;
    const pf = parseFloat(data.pf) || 0;
    const tax = parseFloat(data.tax) || 0;

    const gross = basic + hra + da + allowance;
    const net = gross - pf - tax;

    return { basic, hra, da, allowance, pf, tax, gross, net };
};

exports.getAllStaff = async (req, res, next) => {
    try {
        const staffList = await StaffModel.findAll();
        res.json(staffList);
    } catch (error) {
        next(error);
    }
};

exports.getStaffById = async (req, res, next) => {
    try {
        const staff = await StaffModel.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        res.json(staff);
    } catch (error) {
        next(error);
    }
};

exports.createStaff = async (req, res, next) => {
    try {
        const { name, department } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }

        const calculated = calculateSalary(req.body);
        const newStaffId = await StaffModel.create({ name, department, ...calculated });
        
        res.status(201).json({ message: 'Staff added successfully', id: newStaffId });
    } catch (error) {
        next(error);
    }
};

exports.updateStaff = async (req, res, next) => {
    try {
        const { name, department } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }

        const calculated = calculateSalary(req.body);
        const affectedRows = await StaffModel.update(req.params.id, { name, department, ...calculated });
        
        if (affectedRows === 0) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        res.json({ message: 'Staff updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.deleteStaff = async (req, res, next) => {
    try {
        const affectedRows = await StaffModel.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        res.json({ message: 'Staff deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await StaffModel.getDashboardStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
};
