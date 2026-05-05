const xlsx = require('xlsx');
const StaffModel = require('../models/staffModel');

exports.uploadExcel = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an excel file' });
        }

        // Read the uploaded file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const data = xlsx.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        let insertedCount = 0;

        // Process each row
        for (const row of data) {
            const basic = parseFloat(row.Basic) || 0;
            const hra = parseFloat(row.HRA) || 0;
            const da = parseFloat(row.DA) || 0;
            const allowance = parseFloat(row.Allowance) || 0;
            const pf = parseFloat(row.PF) || 0;
            const tax = parseFloat(row.Tax) || 0;

            const gross = basic + hra + da + allowance;
            const net = gross - pf - tax;

            const staffData = {
                name: row.Name,
                department: row.Department || 'General',
                basic, hra, da, allowance, pf, tax, gross, net
            };

            if (staffData.name) {
                await StaffModel.create(staffData);
                insertedCount++;
            }
        }

        res.json({ message: `Successfully imported ${insertedCount} staff records` });
    } catch (error) {
        next(error);
    }
};
