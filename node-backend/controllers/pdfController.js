const PDFDocument = require('pdfkit');
const StaffModel = require('../models/staffModel');

exports.generateSlip = async (req, res, next) => {
    try {
        const staff = await StaffModel.findById(req.params.id);
        
        if (!staff) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Salary_Slip_${staff.name.replace(/\s+/g, '_')}.pdf`);

        // Initialize PDF Document
        const doc = new PDFDocument({ margin: 50 });

        // Pipe the PDF to the response
        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Atiq Payroll System', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('Salary Slip', { align: 'center' });
        doc.moveDown(2);

        // Employee Details
        doc.fontSize(12).font('Helvetica');
        doc.text(`Employee Name: ${staff.name}`);
        doc.text(`Department: ${staff.department}`);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        // Draw a line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Salary Breakdown
        doc.font('Helvetica-Bold').text('Earnings', 50, doc.y);
        doc.font('Helvetica').text(`Basic Salary: $${staff.basic.toFixed(2)}`);
        doc.text(`HRA: $${staff.hra.toFixed(2)}`);
        doc.text(`DA: $${staff.da.toFixed(2)}`);
        doc.text(`Allowance: $${staff.allowance.toFixed(2)}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Deductions', 50, doc.y);
        doc.font('Helvetica').text(`PF: $${staff.pf.toFixed(2)}`);
        doc.text(`Tax: $${staff.tax.toFixed(2)}`);
        doc.moveDown(2);

        // Draw a line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Totals
        doc.font('Helvetica-Bold').fontSize(14);
        doc.text(`Gross Salary: $${staff.gross.toFixed(2)}`);
        doc.text(`Net Salary: $${staff.net.toFixed(2)}`, { fill: 'green' });

        // Finalize PDF
        doc.end();

    } catch (error) {
        next(error);
    }
};
