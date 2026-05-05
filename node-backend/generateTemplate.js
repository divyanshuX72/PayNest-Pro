const xlsx = require('xlsx');

const wb = xlsx.utils.book_new();

const data = [
    // Header Row
    ['Name', 'Role', 'Department', 'Qualification', 'SalaryType', 'Month', 'Basic', 'HRA', 'DA', 'Allowance', 'PF', 'Tax', 'WorkingDays', 'CL_used', 'Medical_used', 'Personal_leave'],
    
    // Sample Data
    ['Rahul Sharma',    'Lecturer',       'IT',          'Diploma',  'Monthly', 'May', 20000, 5000, 3000, 2000, 1500, 1000, 30, 1, 0, 0],
    ['Amit Kumar',      'Lab Assistant',  'Mechanical',  'Diploma',  'Monthly', 'May', 18000, 4000, 2500, 1500, 1200,  800, 30, 2, 0, 1],
    ['Neha Singh',      'Professor',      'IT',          'B.E',      'Monthly', 'May', 35000, 8000, 5000, 3000, 2000, 1500, 30, 0, 1, 0],
    ['Karan Verma',     'Clerk',          'Admin',       'MCA',      'Monthly', 'May', 22000, 5000, 3000, 2000, 1500, 1000, 30, 3, 0, 2],
    ['Priya Patel',     'HOD',            'Computer',    'M.Tech',   'Monthly', 'May', 45000, 10000, 6000, 4000, 2500, 2000, 30, 0, 0, 0],
];

const ws = xlsx.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = [
    { wch: 18 },  // Name
    { wch: 15 },  // Role
    { wch: 14 },  // Department
    { wch: 14 },  // Qualification
    { wch: 12 },  // SalaryType
    { wch: 8 },   // Month
    { wch: 10 },  // Basic
    { wch: 8 },   // HRA
    { wch: 8 },   // DA
    { wch: 10 },  // Allowance
    { wch: 8 },   // PF
    { wch: 8 },   // Tax
    { wch: 12 },  // WorkingDays
    { wch: 10 },  // CL_used
    { wch: 14 },  // Medical_used
    { wch: 14 },  // Personal_leave
];

xlsx.utils.book_append_sheet(wb, ws, 'Staff Data');
xlsx.writeFile(wb, 'public/PayNest_Staff_Template.xlsx');

console.log('✅ Template created: public/PayNest_Staff_Template.xlsx');
