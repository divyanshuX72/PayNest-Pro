const xlsx = require('xlsx');
const StaffModel = require('../models/staffModel');

const getCurrentCycle = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month <= 6 ? `${year}-H1` : `${year}-H2`;
};

exports.uploadExcel = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an excel file' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        let insertedCount = 0;
        const currentCycle = getCurrentCycle();

        // Excel columns: ID, Name, Role, Department, Section, Level, Month, Basic, HRA, DA, Allowance, PF, Tax, WorkingDays, CL_used, Medical_used, Personal_leave
        for (const row of data) {
            const basic = parseFloat(row.Basic) || 0;
            const hra = parseFloat(row.HRA) || 0;
            const da = parseFloat(row.DA) || 0;
            const allowance = parseFloat(row.Allowance) || 0;
            const pf = parseFloat(row.PF) || 0;
            const tax = parseFloat(row.Tax) || 0;
            const working_days = parseInt(row.WorkingDays) || 30;
            const cl_taken = parseInt(row.CL_used) || 0;
            const medical_taken = parseInt(row.Medical_used) || 0;
            const personal_leave = parseInt(row.Personal_leave) || parseInt(row.LeaveDays) || 0;

            const gross = basic + hra + da + allowance;
            const cl_quota = 8, medical_quota = 2;

            const paid_cl = Math.min(cl_taken, cl_quota);
            const paid_medical = Math.min(medical_taken, medical_quota);
            const unpaid_leaves = Math.max(0, cl_taken - cl_quota) + Math.max(0, medical_taken - medical_quota) + personal_leave;

            const per_day = working_days > 0 ? gross / working_days : 0;
            const deduction = Math.round(per_day * unpaid_leaves * 100) / 100;
            const net = gross - pf - tax;
            const final_salary = Math.round((gross - deduction - pf - tax) * 100) / 100;

            const staffData = {
                employee_id: row.ID !== undefined ? String(row.ID) : '',
                name: row.Name,
                role: row.Role || '',
                department: row.Department || 'General',
                section: row.Section || '',
                level: row.Level || '',
                qualification: row.Qualification || '',
                salary_type: row.SalaryType || 'Monthly',
                basic, hra, da, allowance, pf, tax, gross, net,
                month: row.Month || '',
                working_days, cl_taken, medical_taken, personal_leave,
                cl_quota, cl_used: cl_taken, medical_quota, medical_used: medical_taken,
                unpaid_leaves, deduction, final_salary,
                quota_cycle: currentCycle
            };

            if (staffData.name && staffData.employee_id) {
                // Check for duplicates
                const existing = await StaffModel.findByEmployeeId(staffData.employee_id);
                if (!existing) {
                    await StaffModel.create(staffData);
                    insertedCount++;
                }
            } else if (staffData.name) {
                // If no ID provided, just create
                await StaffModel.create(staffData);
                insertedCount++;
            }
        }

        res.json({ message: `Successfully imported ${insertedCount} staff records` });
    } catch (error) { next(error); }
};
