const PDFDocument = require('pdfkit');
const StaffModel = require('../models/staffModel');

exports.generateSlip = async (req, res, next) => {
    try {
        const staff = await StaffModel.findById(req.params.id);
        if (!staff) return res.status(404).json({ error: 'Staff not found' });

        const safeName = staff.name.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Disposition', `attachment; filename="Salary_Slip_${safeName}.pdf"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        // Header
        doc.fontSize(22).font('Helvetica-Bold').text('PayNest Pro', { align: 'center' });
        doc.fontSize(12).font('Helvetica').fillColor('#666').text('Salary Slip', { align: 'center' });
        if (staff.month) doc.fontSize(10).text(`Month: ${staff.month}`, { align: 'center' });
        doc.fillColor('#000');
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
        doc.moveDown();

        // Employee Details
        doc.fontSize(12).font('Helvetica-Bold').text('Employee Details');
        doc.moveDown(0.4);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${staff.name}`);
        if (staff.role) doc.text(`Role: ${staff.role}`);
        doc.text(`Department: ${staff.department}`);
        if (staff.qualification) doc.text(`Qualification: ${staff.qualification}`);
        doc.text(`Salary Type: ${staff.salary_type || 'Monthly'}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
        doc.moveDown();

        // Attendance
        doc.font('Helvetica-Bold').fontSize(12).text('Attendance & Leave');
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(10);
        const totalLeaves = (staff.cl_taken||0) + (staff.medical_taken||0) + (staff.personal_leave||0);
        const presentDays = (staff.working_days||30) - totalLeaves;
        doc.text(`Working Days: ${staff.working_days || 30}     |     Present: ${presentDays}`);
        doc.text(`CL: ${staff.cl_taken||0}/${staff.cl_quota||8}     |     Medical: ${staff.medical_taken||0}/${staff.medical_quota||2}     |     Personal: ${staff.personal_leave||0}`);
        doc.text(`Unpaid Leaves: ${staff.unpaid_leaves||0}`);
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
        doc.moveDown();

        // Earnings
        doc.font('Helvetica-Bold').fontSize(12).text('Earnings');
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Basic: $${staff.basic.toFixed(2)}    |    HRA: $${staff.hra.toFixed(2)}    |    DA: $${staff.da.toFixed(2)}    |    Allowance: $${staff.allowance.toFixed(2)}`);
        doc.font('Helvetica-Bold').text(`Gross: $${staff.gross.toFixed(2)}`);
        doc.moveDown(1);

        // Deductions
        doc.font('Helvetica-Bold').fontSize(12).text('Deductions');
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(10);
        doc.text(`PF: $${staff.pf.toFixed(2)}    |    Tax: $${staff.tax.toFixed(2)}    |    Leave Deduction: $${(staff.deduction||0).toFixed(2)}`);
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ccc');
        doc.moveDown();

        // Final
        doc.font('Helvetica-Bold').fontSize(16);
        doc.text(`Final Salary: $${(staff.final_salary||0).toFixed(2)}`);

        doc.end();
    } catch (error) { next(error); }
};
