const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

/* ── Indian number formatter ─────────────────────────────────────────────── */
function inr(amount) {
    const num = parseFloat(amount || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Draw a horizontal rule ─────────────────────────────────────────────── */
function rule(doc, color = '#e2e8f0') {
    doc.moveTo(40, doc.y).lineTo(570, doc.y).lineWidth(0.5).strokeColor(color).stroke();
    doc.moveDown(0.6);
}

/* ── Draw a section heading ──────────────────────────────────────────────── */
function sectionHeading(doc, text) {
    doc.moveDown(0.3);
    doc.rect(40, doc.y, 3, 14).fillColor('#3b82f6').fill();
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10).text(text, 52, doc.y, { lineBreak: false });
    doc.moveDown(1.1);
}

/* ── Draw a 2-column label+value row ────────────────────────────────────── */
function infoRow(doc, label, value, y) {
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label + ':', 55, y, { width: 120, continued: false });
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(String(value), 180, y, { width: 180 });
}

function buildPdfDoc(doc, staff, transactionId = 'N/A') {
    const PAGE_W = 595;
    const PAGE_H = 842;

    doc.rect(0, 0, PAGE_W, PAGE_H).fillColor('#ffffff').fill();
    doc.rect(0, 0, PAGE_W, 6).fillColor('#3b82f6').fill();

    let y = 30;
    doc.circle(PAGE_W / 2, y + 20, 22).fillColor('#3b82f6').fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text('₹', (PAGE_W / 2) - 7, y + 12);
    
    y += 55;
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(20).text('PayNest Pro', 40, y, { align: 'center', width: PAGE_W - 80 });
    y += 26;
    doc.fillColor('#64748b').font('Helvetica').fontSize(11).text('SALARY SLIP', 40, y, { align: 'center', width: PAGE_W - 80, characterSpacing: 2 });
    y += 18;

    const monthLabel = staff.month ? `Month: ${staff.month} · ${new Date().getFullYear()}` : `Date: ${new Date().toLocaleDateString('en-IN')}`;
    const badgeW = 160, badgeH = 20, badgeX = (PAGE_W - badgeW) / 2;
    doc.roundedRect(badgeX, y, badgeW, badgeH, 10).fillColor('#eff6ff').fill();
    doc.fillColor('#3b82f6').font('Helvetica').fontSize(9).text(monthLabel, badgeX, y + 5, { width: badgeW, align: 'center' });
    y += 32;

    doc.y = y;
    rule(doc, '#cbd5e1');

    sectionHeading(doc, 'EMPLOYEE DETAILS');
    const boxStart = doc.y - 4;
    doc.rect(40, boxStart, 515, 82).fillColor('#f8fafc').roundedRect(40, boxStart, 515, 82, 4).fill();
    doc.strokeColor('#e2e8f0').lineWidth(0.5).roundedRect(40, boxStart, 515, 82, 4).stroke();

    const r1y = boxStart + 8;
    const r2y = r1y + 20;
    const r3y = r2y + 20;
    const r4y = r3y + 20;

    infoRow(doc, 'Name', staff.name, r1y);
    infoRow(doc, 'Department', staff.department || '—', r2y);
    infoRow(doc, 'Salary Type', staff.salary_type || 'Monthly', r3y);
    infoRow(doc, 'Employee ID', staff.employee_id || ('#' + staff.id), r4y);

    const col2x = 310;
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Role:', col2x, r1y, { width: 80 });
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(staff.role || '—', col2x + 50, r1y, { width: 160 });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Section:', col2x, r2y, { width: 80 });
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(staff.section || '—', col2x + 50, r2y, { width: 160 });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Status:', col2x, r3y, { width: 80 });
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(staff.status || 'Active', col2x + 50, r3y, { width: 160 });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Date:', col2x, r4y, { width: 80 });
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(new Date().toLocaleDateString('en-IN'), col2x + 50, r4y, { width: 160 });

    doc.y = boxStart + 90;
    doc.moveDown(0.5);
    rule(doc, '#e2e8f0');

    sectionHeading(doc, 'PAYMENT DETAILS');
    const payStart = doc.y - 4;
    doc.rect(40, payStart, 515, 42).fillColor('#f8fafc').roundedRect(40, payStart, 515, 42, 4).fill();
    doc.strokeColor('#e2e8f0').lineWidth(0.5).roundedRect(40, payStart, 515, 42, 4).stroke();
    infoRow(doc, 'Payment Date', new Date().toLocaleString('en-IN'), payStart + 8);
    infoRow(doc, 'Transaction ID', transactionId, payStart + 28);
    
    doc.y = payStart + 50;
    doc.moveDown(0.5);
    rule(doc, '#e2e8f0');

    sectionHeading(doc, 'ATTENDANCE & LEAVE');



        const attStart = doc.y - 4;
        doc.rect(40, attStart, 515, 62).fillColor('#f8fafc').roundedRect(40, attStart, 515, 62, 4).fill();
        doc.strokeColor('#e2e8f0').lineWidth(0.5).roundedRect(40, attStart, 515, 62, 4).stroke();

        const totalLeaves = (staff.cl_taken || 0) + (staff.medical_taken || 0) + (staff.personal_leave || 0);
        const presentDays = (staff.working_days || 30) - totalLeaves;
        const at1 = attStart + 8;
        const at2 = at1 + 20;
        const at3 = at2 + 20;

        // Row 1
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('Working Days:', 55, at1, { continued: false });
        doc.font('Helvetica').fillColor('#1e293b').text(String(staff.working_days || 30), 155, at1, { continued: false });
        doc.font('Helvetica-Bold').fillColor('#64748b').text('Present:', 280, at1, { continued: false });
        doc.font('Helvetica').fillColor('#22c55e').text(String(presentDays), 335, at1);

        // Row 2 - paid leaves
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('CL Used:', 55, at2);
        doc.font('Helvetica').fillColor('#1e293b').text(`${staff.cl_taken || 0} / ${staff.cl_quota || 8}`, 155, at2);
        doc.font('Helvetica-Bold').fillColor('#64748b').text('Medical:', 280, at2);
        doc.font('Helvetica').fillColor('#1e293b').text(`${staff.medical_taken || 0} / ${staff.medical_quota || 2}`, 335, at2);

        // Row 3 - unpaid
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('Personal Leave:', 55, at3);
        doc.font('Helvetica').fillColor('#ef4444').text(String(staff.personal_leave || 0), 155, at3);
        doc.font('Helvetica-Bold').fillColor('#64748b').text('Unpaid Leaves:', 280, at3);
        doc.font('Helvetica').fillColor('#ef4444').text(String(staff.unpaid_leaves || 0), 380, at3);

        doc.y = attStart + 70;
        doc.moveDown(0.5);
        rule(doc, '#e2e8f0');

        /* ── EARNINGS ────────────────────────────────────────────────────── */
        sectionHeading(doc, 'EARNINGS');

        const earningItems = [
            ['Basic Salary',  staff.basic     || 0],
            ['HRA',           staff.hra       || 0],
            ['DA',            staff.da        || 0],
            ['Allowance',     staff.allowance || 0],
        ];

        // Table header
        let ty = doc.y;
        doc.rect(40, ty - 2, 515, 16).fillColor('#1e40af').fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
           .text('Component', 55, ty + 2, { width: 300 });
        doc.fillColor('#ffffff').text('Amount', 0, ty + 2, { align: 'right', width: 510 });
        ty += 18;
        doc.y = ty;

        earningItems.forEach(([label, amount], i) => {
            const rowY = ty + i * 18;
            if (i % 2 === 0) {
                doc.rect(40, rowY - 2, 515, 18).fillColor('#f8fafc').fill();
            }
            doc.font('Helvetica').fontSize(9).fillColor('#334155').text(label, 55, rowY, { width: 300 });
            doc.font('Helvetica').fontSize(9).fillColor('#1e293b').text(inr(amount), 0, rowY, { align: 'right', width: 510 });
        });

        ty += earningItems.length * 18 + 6;

        // Gross total row
        doc.rect(40, ty - 2, 515, 20).fillColor('#dbeafe').fill();
        doc.strokeColor('#93c5fd').lineWidth(0.5).rect(40, ty - 2, 515, 20).stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1d4ed8')
           .text('Gross Salary', 55, ty + 2, { width: 300 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1d4ed8')
           .text(inr(staff.gross || 0), 0, ty + 2, { align: 'right', width: 510 });
        ty += 26;

        doc.y = ty;
        doc.moveDown(0.5);
        rule(doc, '#e2e8f0');

        /* ── DEDUCTIONS ──────────────────────────────────────────────────── */
        sectionHeading(doc, 'DEDUCTIONS');

        const deductItems = [
            ['Provident Fund (PF)',  staff.pf         || 0],
            ['Income Tax',          staff.tax        || 0],
            ['Leave Deduction',     staff.deduction  || 0],
        ];

        // Table header
        let dy = doc.y;
        doc.rect(40, dy - 2, 515, 16).fillColor('#7f1d1d').fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5)
           .text('Deduction Type', 55, dy + 2, { width: 300 });
        doc.fillColor('#ffffff').text('Amount', 0, dy + 2, { align: 'right', width: 510 });
        dy += 18;
        doc.y = dy;

        const totalDed = deductItems.reduce((s, [, v]) => s + v, 0);

        deductItems.forEach(([label, amount], i) => {
            const rowY = dy + i * 18;
            if (i % 2 === 0) {
                doc.rect(40, rowY - 2, 515, 18).fillColor('#fff5f5').fill();
            }
            doc.font('Helvetica').fontSize(9).fillColor('#334155').text(label, 55, rowY, { width: 300 });
            doc.font('Helvetica').fontSize(9).fillColor('#dc2626')
               .text('- ' + inr(amount), 0, rowY, { align: 'right', width: 510 });
        });

        dy += deductItems.length * 18 + 6;

        // Total deductions row
        doc.rect(40, dy - 2, 515, 20).fillColor('#fee2e2').fill();
        doc.strokeColor('#fca5a5').lineWidth(0.5).rect(40, dy - 2, 515, 20).stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#dc2626')
           .text('Total Deductions', 55, dy + 2, { width: 300 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#dc2626')
           .text('- ' + inr(totalDed), 0, dy + 2, { align: 'right', width: 510 });
        dy += 26;
        doc.y = dy;

        doc.moveDown(0.6);
        rule(doc, '#94a3b8');

        /* ── FINAL SALARY (BIG) ──────────────────────────────────────────── */
        const fs = staff.final_salary || 0;
        const finalY = doc.y;

        // Green highlight box
        doc.rect(40, finalY, 515, 54).fillColor('#f0fdf4').roundedRect(40, finalY, 515, 54, 6).fill();
        doc.strokeColor('#22c55e').lineWidth(1).roundedRect(40, finalY, 515, 54, 6).stroke();

        doc.font('Helvetica-Bold').fontSize(11).fillColor('#15803d')
           .text('NET SALARY (TAKE HOME)', 55, finalY + 10);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
           .text('Gross Salary - Total Deductions', 55, finalY + 26);

        // Big amount on the right
        doc.font('Helvetica-Bold').fontSize(22).fillColor('#16a34a')
           .text(inr(fs), 0, finalY + 14, { align: 'right', width: 510 });

        doc.y = finalY + 62;
        doc.moveDown(0.8);

        /* ── IN WORDS ────────────────────────────────────────────────────── */
        rule(doc, '#e2e8f0');

        const footY = PAGE_H - 50;
        doc.rect(0, footY, PAGE_W, 50).fillColor('#f8fafc').fill();
        doc.rect(0, footY, PAGE_W, 1).fillColor('#cbd5e1').fill();

        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
           .text('This is a system-generated salary slip and does not require a signature.', 40, footY + 12, { align: 'center', width: PAGE_W - 80 });
        doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1')
           .text(`Generated on ${new Date().toLocaleString('en-IN')}  ·  PayNest Pro`, 40, footY + 28, { align: 'center', width: PAGE_W - 80 });

        doc.rect(0, PAGE_H - 6, PAGE_W, 6).fillColor('#3b82f6').fill();
}

exports.generateAndSaveSlip = async (staff, payroll_id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const slipsDir = path.join(__dirname, '..', 'public', 'slips');
            if (!fs.existsSync(slipsDir)) {
                fs.mkdirSync(slipsDir, { recursive: true });
            }

            const transaction_id = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const safeName = staff.name.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
            const fileName = `slip_${payroll_id}_${safeName}_${Date.now()}.pdf`;
            const filePath = path.join(slipsDir, fileName);
            const dbPath = `/slips/${fileName}`;

            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 0, size: 'A4' });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            buildPdfDoc(doc, staff, transaction_id);
            doc.end();

            stream.on('finish', async () => {
                try {
                    await pool.query('UPDATE payroll SET transaction_id = ?, slip_generated = ? WHERE id = ?', [transaction_id, true, payroll_id]);
                    await pool.query('INSERT INTO salary_slips (staff_id, payroll_id, pdf_path) VALUES (?, ?, ?)', [staff.id, payroll_id, dbPath]);
                    resolve(dbPath);
                } catch(e) { reject(e); }
            });
            stream.on('error', reject);
        } catch (e) { reject(e); }
    });
};

exports.generateSlip = async (req, res, next) => {
    try {
        const staff_id = req.params.id;
        const [slips] = await pool.query('SELECT pdf_path FROM salary_slips WHERE staff_id = ? ORDER BY id DESC LIMIT 1', [staff_id]);
        
        if (slips.length === 0) {
            return res.status(404).json({ error: 'Slip not available until payment is completed' });
        }
        
        const pdfPath = path.join(__dirname, '..', 'public', slips[0].pdf_path);
        if (fs.existsSync(pdfPath)) {
            const safeName = path.basename(pdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
            fs.createReadStream(pdfPath).pipe(res);
        } else {
            res.status(404).json({ error: 'PDF file missing' });
        }
    } catch (error) {
        next(error);
    }
};
