const ExcelJS = require('exceljs');
const path = require('path');

async function generateTemplate() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'PayNest Pro';
    wb.created = new Date();

    const ws = wb.addWorksheet('Staff Data', {
        views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
    });

    // ─── COLUMN DEFINITIONS ───────────────────────────────────────
    ws.columns = [
        { key: 'id',             header: 'ID',             width: 8  },
        { key: 'name',           header: 'Name',           width: 20 },
        { key: 'role',           header: 'Role',           width: 16 },
        { key: 'department',     header: 'Department',     width: 16 },
        { key: 'section',        header: 'Section',        width: 14 },
        { key: 'month',          header: 'Month',          width: 10 },
        { key: 'basic',          header: 'Basic',          width: 12 },
        { key: 'hra',            header: 'HRA',            width: 10 },
        { key: 'da',             header: 'DA',             width: 10 },
        { key: 'allowance',      header: 'Allowance',      width: 12 },
        { key: 'pf',             header: 'PF',             width: 10 },
        { key: 'tax',            header: 'Tax',            width: 10 },
        { key: 'workingdays',    header: 'WorkingDays',    width: 14 },
        { key: 'cl_used',        header: 'CL_used',        width: 10 },
        { key: 'medical_used',   header: 'Medical_used',   width: 14 },
        { key: 'personal_leave', header: 'Personal_leave', width: 15 },
    ];

    // ─── HEADER ROW STYLE ─────────────────────────────────────────
    const headerRow = ws.getRow(1);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
        cell.font        = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill        = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment   = { horizontal: 'center', vertical: 'middle', wrapText: false };
        cell.border = {
            top:    { style: 'thin', color: { argb: 'FF1E3A8A' } },
            left:   { style: 'thin', color: { argb: 'FF1E3A8A' } },
            bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
            right:  { style: 'thin', color: { argb: 'FF1E3A8A' } },
        };
    });

    // ─── SAMPLE DATA ──────────────────────────────────────────────
    const sampleData = [
        { id: 101, name: 'Rahul Sharma',  role: 'Lecturer',      department: 'IT',         section: 'Software', month: 'May', basic: 20000, hra: 5000, da: 3000, allowance: 2000, pf: 1500, tax: 1000, workingdays: 30, cl_used: 1, medical_used: 0, personal_leave: 0 },
        { id: 102, name: 'Amit Kumar',    role: 'Lab Assistant',  department: 'Mechanical', section: 'Workshop', month: 'May', basic: 18000, hra: 4000, da: 2500, allowance: 1500, pf: 1200, tax: 800,  workingdays: 30, cl_used: 2, medical_used: 0, personal_leave: 1 },
        { id: 103, name: 'Neha Singh',    role: 'Professor',      department: 'IT',         section: 'Software', month: 'May', basic: 35000, hra: 8000, da: 5000, allowance: 3000, pf: 2000, tax: 1500, workingdays: 30, cl_used: 0, medical_used: 1, personal_leave: 0 },
        { id: 104, name: 'Karan Verma',   role: 'Clerk',          department: 'Admin',      section: 'Office',   month: 'May', basic: 22000, hra: 5000, da: 3000, allowance: 2000, pf: 1500, tax: 1000, workingdays: 30, cl_used: 3, medical_used: 0, personal_leave: 2 },
        { id: 105, name: 'Priya Patel',   role: 'HOD',            department: 'Computer',   section: 'Software', month: 'May', basic: 45000, hra: 10000,da: 6000, allowance: 4000, pf: 2500, tax: 2000, workingdays: 30, cl_used: 0, medical_used: 0, personal_leave: 0 },
    ];

    // Salary column keys (green bg)
    const salaryCols   = ['basic', 'hra', 'da', 'allowance', 'pf', 'tax'];
    // Leave column keys (orange bg)
    const leaveCols    = ['cl_used', 'medical_used', 'personal_leave'];

    const COLORS = {
        rowWhite:   'FFFFFFFF',
        rowGray:    'FFF3F4F6',
        salaryBg:   'FFD1FAE5', // light green
        leaveBg:    'FFFDE8D0', // soft orange
        border:     'FFD1D5DB',
    };

    sampleData.forEach((rowData, idx) => {
        const row        = ws.addRow(rowData);
        row.height       = 22;
        const isEven     = idx % 2 !== 0;
        const baseColor  = isEven ? COLORS.rowGray : COLORS.rowWhite;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const colKey = ws.columns[colNumber - 1].key;

            // Background: salary / leave / zebra
            let bgColor = baseColor;
            if (salaryCols.includes(colKey))  bgColor = COLORS.salaryBg;
            if (leaveCols.includes(colKey))   bgColor = COLORS.leaveBg;

            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.font      = { name: 'Calibri', size: 11, bold: salaryCols.includes(colKey) };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border    = {
                top:    { style: 'thin', color: { argb: COLORS.border } },
                left:   { style: 'thin', color: { argb: COLORS.border } },
                bottom: { style: 'thin', color: { argb: COLORS.border } },
                right:  { style: 'thin', color: { argb: COLORS.border } },
            };

            // Currency format for salary columns
            if (salaryCols.includes(colKey)) {
                cell.numFmt = '₹#,##0';
            }
        });
    });

    // ─── OUTPUT ───────────────────────────────────────────────────
    const outPath = path.join(__dirname, 'public', 'PayNest_Staff_Template.xlsx');
    await wb.xlsx.writeFile(outPath);
    console.log('✅ Template created:', outPath);
}

generateTemplate().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
