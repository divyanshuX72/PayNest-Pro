const xlsx = require('xlsx');
const StaffModel = require('../models/staffModel');

// ─── DOWNLOAD STYLED TEMPLATE ─────────────────────────────────────────────────
exports.downloadTemplate = async (req, res, next) => {
    try {
        let ExcelJS;
        try {
            ExcelJS = require('exceljs');
        } catch (e) {
            // exceljs not installed — fall back to plain xlsx
            return res.status(500).json({ error: 'ExcelJS not installed. Run: npm install exceljs' });
        }

        const wb = new ExcelJS.Workbook();
        wb.creator = 'PayNest Pro';
        wb.created = new Date();

        const ws = wb.addWorksheet('Staff Template', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        ws.columns = [
            { key: 'id',             header: 'ID',             width: 8  },
            { key: 'name',           header: 'Name',           width: 22 },
            { key: 'role',           header: 'Role',           width: 16 },
            { key: 'department',     header: 'Department',     width: 16 },
            { key: 'section',        header: 'Section',        width: 14 },
            { key: 'qualification',  header: 'Qualification',  width: 16 },
            { key: 'month',          header: 'Month',          width: 10 },
            { key: 'basic',          header: 'Basic',          width: 13 },
            { key: 'hra',            header: 'HRA',            width: 11 },
            { key: 'da',             header: 'DA',             width: 11 },
            { key: 'allowance',      header: 'Allowance',      width: 13 },
            { key: 'pf',             header: 'PF',             width: 11 },
            { key: 'tax',            header: 'Tax',            width: 11 },
            { key: 'workingdays',    header: 'WorkingDays',    width: 14 },
            { key: 'cl_used',        header: 'CL_used',        width: 11 },
            { key: 'medical_used',   header: 'Medical_used',   width: 15 },
            { key: 'personal_leave', header: 'Personal_leave', width: 16 },
        ];

        // ── Header row styling ──────────────────────────────────────
        const headerRow = ws.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell((cell) => {
            cell.font      = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = {
                top:    { style: 'thin', color: { argb: 'FF1E3A8A' } },
                left:   { style: 'thin', color: { argb: 'FF1E3A8A' } },
                bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                right:  { style: 'thin', color: { argb: 'FF1E3A8A' } },
            };
        });

        // ── Sample data ─────────────────────────────────────────────
        const sampleData = [
            { id: 101, name: 'Rahul Sharma',  role: 'Lecturer',     department: 'IT',         section: 'Software', qualification: 'B.E',    month: 'May', basic: 20000, hra: 5000,  da: 3000, allowance: 2000, pf: 1500, tax: 1000, workingdays: 30, cl_used: 1, medical_used: 0, personal_leave: 0 },
            { id: 102, name: 'Amit Kumar',    role: 'Lab Assistant', department: 'Mechanical', section: 'Workshop', qualification: 'Diploma', month: 'May', basic: 18000, hra: 4000,  da: 2500, allowance: 1500, pf: 1200, tax: 800,  workingdays: 30, cl_used: 2, medical_used: 0, personal_leave: 1 },
            { id: 103, name: 'Neha Singh',    role: 'Professor',     department: 'IT',         section: 'Software', qualification: 'M.Tech', month: 'May', basic: 35000, hra: 8000,  da: 5000, allowance: 3000, pf: 2000, tax: 1500, workingdays: 30, cl_used: 0, medical_used: 1, personal_leave: 0 },
            { id: 104, name: 'Karan Verma',   role: 'Clerk',         department: 'Admin',      section: 'Office',   qualification: 'B.E',    month: 'May', basic: 22000, hra: 5000,  da: 3000, allowance: 2000, pf: 1500, tax: 1000, workingdays: 30, cl_used: 3, medical_used: 0, personal_leave: 2 },
            { id: 105, name: 'Priya Patel',   role: 'HOD',           department: 'Computer',   section: 'Software', qualification: 'MCA',    month: 'May', basic: 45000, hra: 10000, da: 6000, allowance: 4000, pf: 2500, tax: 2000, workingdays: 30, cl_used: 0, medical_used: 0, personal_leave: 0 },
        ];

        const salaryCols = ['basic', 'hra', 'da', 'allowance', 'pf', 'tax'];
        const leaveCols  = ['cl_used', 'medical_used', 'personal_leave'];

        sampleData.forEach((rowData, idx) => {
            const row       = ws.addRow(rowData);
            row.height      = 22;
            const baseColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF3F4F6';

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const colKey = ws.columns[colNumber - 1].key;
                let bgColor  = baseColor;
                if (salaryCols.includes(colKey)) bgColor = 'FFD1FAE5';
                if (leaveCols.includes(colKey))  bgColor = 'FFFDE8D0';

                cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                cell.font      = { name: 'Calibri', size: 11, bold: salaryCols.includes(colKey) };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border    = {
                    top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
                };
                if (salaryCols.includes(colKey)) cell.numFmt = '₹#,##0';
            });
        });

        // ── Stream to client ─────────────────────────────────────────
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="PayNest_Import_Template.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (err) { next(err); }
};

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
        const rawData = xlsx.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        // Normalize column headers to handle case-insensitive matching
        const normalizeKey = (key) => {
            const k = key.trim().toLowerCase().replace(/[\s_-]+/g, '_');
            const map = {
                'id': 'ID', 'name': 'Name', 'role': 'Role',
                'department': 'Department', 'dept': 'Department',
                'section': 'Section', 'qualification': 'Qualification',
                'month': 'Month', 'basic': 'Basic', 'hra': 'HRA',
                'da': 'DA', 'allowance': 'Allowance', 'pf': 'PF',
                'tax': 'Tax', 'workingdays': 'WorkingDays', 'working_days': 'WorkingDays',
                'cl_used': 'CL_used', 'cl': 'CL_used', 'clused': 'CL_used',
                'medical_used': 'Medical_used', 'medicalused': 'Medical_used', 'medical': 'Medical_used',
                'personal_leave': 'Personal_leave', 'personalleave': 'Personal_leave',
                'leavedays': 'LeaveDays', 'leave_days': 'LeaveDays',
                'level': 'Level', 'salarytype': 'SalaryType', 'salary_type': 'SalaryType',
                'gross': 'Gross', 'net': 'Net', 'final_salary': 'FinalSalary',
                'finalsalary': 'FinalSalary', 'deduction': 'Deduction'
            };
            return map[k] || key;
        };

        const data = rawData.map(row => {
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
                normalized[normalizeKey(key)] = value;
            }
            return normalized;
        });

        let insertedCount = 0;
        const currentCycle = getCurrentCycle();

        // Excel columns: ID, Name, Role, Department, Section, Qualification, Month, Basic, HRA, DA, Allowance, PF, Tax, WorkingDays, CL_used, Medical_used, Personal_leave
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

            // Use pre-calculated values from Excel if available, otherwise calculate
            let gross = parseFloat(row.Gross) || (basic + hra + da + allowance);
            if (gross === 0 && basic > 0) gross = basic + hra + da + allowance;
            const cl_quota = 8, medical_quota = 2;

            const paid_cl = Math.min(cl_taken, cl_quota);
            const paid_medical = Math.min(medical_taken, medical_quota);
            const unpaid_leaves = Math.max(0, cl_taken - cl_quota) + Math.max(0, medical_taken - medical_quota) + personal_leave;

            const per_day = working_days > 0 ? gross / working_days : 0;
            const deduction = parseFloat(row.Deduction) || Math.round(per_day * unpaid_leaves * 100) / 100;
            const net = parseFloat(row.Net) || (gross - pf - tax);
            const final_salary = parseFloat(row.FinalSalary) || Math.round((gross - deduction - pf - tax) * 100) / 100;

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
