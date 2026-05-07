const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const crypto = require('crypto');

/* ── Helpers ──────────────────────────────────────────────────────────── */
function inr(amount) {
    const n = parseFloat(amount || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(num) {
    if (!num || num === 0) return 'Zero';
    num = Math.floor(Math.abs(num));
    const o = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
        'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const t = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const below100 = n => n < 20 ? o[n] : t[Math.floor(n/10)] + (n%10 ? ' '+o[n%10] : '');
    const below1000 = n => n < 100 ? below100(n) : o[Math.floor(n/100)]+' Hundred'+(n%100?' and '+below100(n%100):'');
    let w = '';
    if (num >= 10000000) { w += below1000(Math.floor(num/10000000))+' Crore '; num %= 10000000; }
    if (num >= 100000) { w += below100(Math.floor(num/100000))+' Lakh '; num %= 100000; }
    if (num >= 1000) { w += below100(Math.floor(num/1000))+' Thousand '; num %= 1000; }
    if (num > 0) w += below1000(num);
    return w.trim();
}

function amountInWords(amount) {
    const n = parseFloat(amount || 0);
    const rupees = Math.floor(n);
    const paise = Math.round((n - rupees) * 100);
    let w = 'Rupees ' + numberToWords(rupees);
    if (paise > 0) w += ' and ' + numberToWords(paise) + ' Paise';
    return w + ' Only.';
}

function getMonthNum(m) {
    const map = {jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,
        jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
    return map[(m||'').toLowerCase()] || new Date().getMonth()+1;
}

function genSlipId(empId, month, year) {
    const mn = String(getMonthNum(month)).padStart(2,'0');
    const eid = String(empId).replace(/\D/g,'') || '00000';
    return `PS-${year}-${mn}-${eid}`;
}

function drawBadge(doc, text, x, y, w, h, bg, fg) {
    doc.save();
    doc.roundedRect(x, y, w, h, h/2).fillColor(bg).fill();
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(7).text(text, x, y+2.5, {width:w,align:'center'});
    doc.restore();
}

/* ── Build the premium PDF ────────────────────────────────────────────── */
async function buildPdfDoc(doc, staff, txnId, slipId, qrBuf) {
    let FONT_REG = 'Helvetica';
    let FONT_BOLD = 'Helvetica-Bold';
    let FONT_OBL = 'Helvetica-Oblique';
    
    // Windows standard fonts support ₹, Helvetica does not
    if (fs.existsSync('C:/Windows/Fonts/arial.ttf')) {
        doc.registerFont('Arial', 'C:/Windows/Fonts/arial.ttf');
        FONT_REG = 'Arial';
        FONT_OBL = 'Arial'; // Use regular if oblique not found easily
        if (fs.existsSync('C:/Windows/Fonts/arialbd.ttf')) {
            doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf');
            FONT_BOLD = 'Arial-Bold';
        } else {
            FONT_BOLD = 'Arial';
        }
    }

    const PW = 595, PH = 842, M = 40, CW = PW - 2*M;

    // Background & outer card
    doc.rect(0,0,PW,PH).fillColor('#ffffff').fill();
    doc.rect(M,M,CW,PH-2*M).strokeColor('#e2e8f0').lineWidth(1).stroke();

    /* ── HEADER ───────────────────────────────────────────────────────── */
    let y = M + 20;
    
    // Logo (Simple circle)
    doc.circle(M + 25, y + 15, 12).fillColor('#1e40af').fill();
    doc.fillColor('#ffffff').font(FONT_BOLD).fontSize(10).text('PN', M + 18, y + 10);

    // Company info
    doc.fillColor('#0f172a').font(FONT_BOLD).fontSize(14).text('PayNest Pro Solutions', M + 45, y);
    doc.fillColor('#64748b').font(FONT_REG).fontSize(9).text('Bangalore', M + 45, y + 18);
    doc.fillColor('#64748b').fontSize(9).text('support@paynest.pro', M + 45, y + 30);

    // Right side
    doc.fillColor('#0f172a').font(FONT_BOLD).fontSize(18).text('Salary Slip', 0, y, {width: PW - M - 20, align: 'right'});
    
    const monthLabel = (staff.month || 'January') + ' ' + (staff.payroll_year || new Date().getFullYear());
    doc.fillColor('#475569').font(FONT_REG).fontSize(11).text(monthLabel, 0, y + 22, {width: PW - M - 20, align: 'right'});

    /* ── DIVIDER ──────────────────────────────────────────────────────── */
    y = y + 60;
    doc.moveTo(M, y).lineTo(PW - M, y).strokeColor('#e2e8f0').lineWidth(1).stroke();

    /* ── EMPLOYEE DETAILS ─────────────────────────────────────────────── */
    y += 20;
    doc.fillColor('#0f172a').font(FONT_BOLD).fontSize(11).text('Employee Details', M + 20, y);
    
    y += 20;
    const col1X = M + 20;
    const col2X = M + 250;
    
    const eLabel = (lbl, val, ly, lx) => {
        doc.font(FONT_REG).fontSize(9).fillColor('#64748b').text(lbl, lx, ly);
        doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(String(val || '—'), lx, ly + 14);
    };

    eLabel('Name', staff.name, y, col1X);
    eLabel('Employee ID', staff.employee_id || ('#' + staff.id), y, col2X);
    
    y += 40;
    eLabel('Role', staff.role || '—', y, col1X);
    eLabel('Department', staff.department || '—', y, col2X);

    y += 40;
    eLabel('Section', staff.section || '—', y, col1X);
    
    // Slip ID & Transaction ID on the right
    doc.font(FONT_REG).fontSize(9).fillColor('#64748b').text('Slip ID', col2X, y);
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(slipId || '—', col2X, y + 14);
    
    y += 40;
    doc.font(FONT_REG).fontSize(9).fillColor('#64748b').text('Transaction ID', col2X, y);
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(txnId || '—', col2X, y + 14);

    /* ── ROW 2: Earnings + Deductions ─────────────────────────────────── */
    y += 50;
    doc.moveTo(M, y).lineTo(PW - M, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    y += 20;
    const hw = (CW - 40) / 2;
    const rx = M + 20 + hw + 20;
    const lx = M + 20;

    // -- Earnings --
    doc.fillColor('#0f172a').font(FONT_BOLD).fontSize(11).text('Earnings', lx, y);
    
    const earnings = [
        ['Basic Salary', staff.basic || 0],
        ['HRA', staff.hra || 0],
        ['DA', staff.da || 0],
        ['Allowance', staff.allowance || 0]
    ];
    const totalEarnings = earnings.reduce((s, e) => s + e[1], 0);
    
    let ey2 = y + 20;
    earnings.forEach(([lbl, amt]) => {
        doc.font(FONT_REG).fontSize(9).fillColor('#475569').text(lbl, lx, ey2);
        doc.font(FONT_REG).fontSize(9).fillColor('#0f172a').text(inr(amt), lx, ey2, {width: hw - 10, align: 'right'});
        ey2 += 20;
    });
    
    doc.moveTo(lx, ey2 + 5).lineTo(lx + hw - 10, ey2 + 5).strokeColor('#e2e8f0').lineWidth(1).stroke();
    ey2 += 15;
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text('Total Earnings', lx, ey2);
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(inr(totalEarnings), lx, ey2, {width: hw - 10, align: 'right'});

    // -- Deductions --
    doc.fillColor('#0f172a').font(FONT_BOLD).fontSize(11).text('Deductions', rx, y);

    const deductions = [
        ['PF', staff.pf || 0],
        ['Tax', staff.tax || 0],
        ['Leave Deduction', staff.deduction || 0]
    ];
    const totalDeductions = deductions.reduce((s, d) => s + d[1], 0);
    
    let dy = y + 20;
    deductions.forEach(([lbl, amt]) => {
        doc.font(FONT_REG).fontSize(9).fillColor('#475569').text(lbl, rx, dy);
        doc.font(FONT_REG).fontSize(9).fillColor('#0f172a').text(inr(amt), rx, dy, {width: hw - 10, align: 'right'});
        dy += 20;
    });

    doc.moveTo(rx, ey2 - 10).lineTo(rx + hw - 10, ey2 - 10).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text('Total Deductions', rx, ey2);
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(inr(totalDeductions), rx, ey2, {width: hw - 10, align: 'right'});

    /* ── NET SALARY BOX ───────────────────────────────────────────────── */
    y = ey2 + 40;
    
    doc.moveTo(M, y).lineTo(PW - M, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 30;

    const netSalary = staff.final_salary || 0;
    
    doc.fillColor('#475569').font(FONT_REG).fontSize(12).text('Net Salary', 0, y, {width: PW, align: 'center'});
    doc.fillColor('#16a34a').font(FONT_BOLD).fontSize(24).text(inr(netSalary), 0, y + 20, {width: PW, align: 'center'});

    /* ── AMOUNT IN WORDS ──────────────────────────────────────────────── */
    y += 55;
    doc.fillColor('#64748b').font(FONT_OBL).fontSize(10)
        .text(amountInWords(netSalary), 0, y, {width: PW, align: 'center'});

    /* ── QR CODE ──────────────────────────────────────────────────────── */
    if (qrBuf) {
        const qy = PH - M - 90;
        doc.image(qrBuf, (PW - 60) / 2, qy, { width: 60, height: 60 });
    }

    /* ── FOOTER ───────────────────────────────────────────────────────── */
    const fy = PH - M - 20;
    doc.fillColor('#94a3b8').font(FONT_REG).fontSize(8)
        .text('This is a computer-generated salary slip.', 0, fy, {width: PW, align: 'center'});
}

/* ── Generate & Save Slip ─────────────────────────────────────────────── */
exports.generateAndSaveSlip = async (staff, payroll_id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const slipsDir = path.join(__dirname, '..', 'public', 'slips');
            if (!fs.existsSync(slipsDir)) fs.mkdirSync(slipsDir, { recursive: true });

            // Prevent duplicate slips
            const [existing] = await pool.query('SELECT pdf_path FROM salary_slips WHERE payroll_id = ?', [payroll_id]);
            if (existing.length > 0) return resolve(existing[0].pdf_path);

            const txnId = 'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            const vToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
            const year = staff.payroll_year || new Date().getFullYear();
            const slipId = genSlipId(staff.employee_id || staff.id, staff.month, year);
            const verifyUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/verify.html?token=${vToken}`;

            // Generate QR
            let qrBuf = null;
            try {
                const QRCode = require('qrcode');
                qrBuf = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1, color: { dark: '#1a2e3b' } });
            } catch (e) { console.warn('QR generation skipped:', e.message); }

            const safeName = staff.name.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
            const fileName = `slip_${payroll_id}_${safeName}_${Date.now()}.pdf`;
            const filePath = path.join(slipsDir, fileName);
            const dbPath = `/slips/${fileName}`;

            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 0, size: 'A4' });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            await buildPdfDoc(doc, staff, txnId, slipId, qrBuf);
            doc.end();

            stream.on('finish', async () => {
                try {
                    await pool.query('UPDATE payroll SET transaction_id=?, slip_generated=? WHERE id=?', [txnId, true, payroll_id]);
                    await pool.query(
                        'INSERT INTO salary_slips (slip_id, verification_token, staff_id, payroll_id, pdf_path) VALUES (?,?,?,?,?)',
                        [slipId, vToken, staff.id, payroll_id, dbPath]
                    );
                    resolve(dbPath);
                } catch (e) { reject(e); }
            });
            stream.on('error', reject);
        } catch (e) { reject(e); }
    });
};

/* ── Download Slip ────────────────────────────────────────────────────── */
exports.generateSlip = async (req, res, next) => {
    try {
        const staff_id = req.params.id;
        const [slips] = await pool.query('SELECT pdf_path FROM salary_slips WHERE staff_id=? ORDER BY id DESC LIMIT 1', [staff_id]);
        if (slips.length === 0) return res.status(404).json({ error: 'Slip not available until payment is completed' });

        const pdfPath = path.join(__dirname, '..', 'public', slips[0].pdf_path);
        if (fs.existsSync(pdfPath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(pdfPath)}"`);
            fs.createReadStream(pdfPath).pipe(res);
        } else {
            res.status(404).json({ error: 'PDF file missing' });
        }
    } catch (error) { next(error); }
};

/* ── Verify Slip (public) ─────────────────────────────────────────────── */
exports.verifySlip = async (req, res, next) => {
    try {
        const { token } = req.params;
        const [rows] = await pool.query(`
            SELECT ss.slip_id, ss.generated_at, ss.verification_token,
                   s.name, s.employee_id, s.department,
                   p.payroll_month, p.payroll_year, p.payment_status, p.final_salary, p.transaction_id
            FROM salary_slips ss
            JOIN staff s ON ss.staff_id = s.id
            JOIN payroll p ON ss.payroll_id = p.id
            WHERE ss.verification_token = ?
        `, [token]);

        if (rows.length === 0) return res.json({ valid: false, message: 'Invalid or expired verification token.' });

        const r = rows[0];
        res.json({
            valid: true,
            slipId: r.slip_id,
            employeeName: r.name,
            employeeId: r.employee_id,
            department: r.department,
            payrollMonth: r.payroll_month + ' ' + r.payroll_year,
            paymentStatus: r.payment_status,
            finalSalary: r.final_salary,
            transactionId: r.transaction_id,
            generatedAt: r.generated_at
        });
    } catch (error) { next(error); }
};
