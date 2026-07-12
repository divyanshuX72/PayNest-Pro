const db = require('../config/dbSetup');

// Helper to safely execute queries enforcing SELECT only
const safeQuery = async (query, params = []) => {
    if (/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i.test(query)) {
        throw new Error('Only SELECT queries are allowed.');
    }
    const [rows] = await db.query(query, params);
    return rows;
};

// Memory context (simple in-memory for MVP, in production use Redis)
const contexts = {};
const getContext = (adminId) => {
    if (!contexts[adminId]) contexts[adminId] = {};
    return contexts[adminId];
};

const classifyIntent = async (msg) => {
    const lower = msg.toLowerCase().trim();
    let result = { intent: 'unknown', entities: {} };

    // Greetings
    if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))/i.test(lower)) {
        return { intent: 'greeting', entities: {} };
    }
    // Help
    if (/^(help|what can you do|how to use|commands)/i.test(lower)) {
        return { intent: 'help', entities: {} };
    }

    // Follow-ups (He, She, His, Her)
    if (/\b(he|she|his|her|him)\b/i.test(lower)) {
        let subIntent = 'employee_search';
        if (/\b(leave|cl|medical|sick)\b/i.test(lower)) subIntent = 'leave_info';
        else if (/\b(attendance|present|absent)\b/i.test(lower)) subIntent = 'attendance';
        else if (/\b(salary|pay|gross|net)\b/i.test(lower)) subIntent = 'salary_info';
        return { intent: 'followup', entities: { sub_intent: subIntent } };
    }

    // Top deductors, rankings
    if (/\b(top|highest|max|maximum)\s+(\d+)?\s*(deductions?|cuts?)\b/i.test(lower)) {
        const m = lower.match(/(top|highest|max|maximum)\s+(\d+)?\s*(deductions?|cuts?)/i);
        return { intent: 'top_deductions', entities: { count: m[2] ? parseInt(m[2]) : 5 } };
    }
    if (/\b(top|highest|max|maximum)\s+(\d+)?\s*(salaries|salary|paid)\b/i.test(lower)) {
        const m = lower.match(/(top|highest|max|maximum)\s+(\d+)?\s*(salaries|salary|paid)/i);
        return { intent: 'salary_ranking', entities: { count: m[2] ? parseInt(m[2]) : 5, order: 'DESC' } };
    }
    if (/\b(bottom|lowest|min|minimum)\s+(\d+)?\s*(salaries|salary|paid)\b/i.test(lower)) {
        const m = lower.match(/(bottom|lowest|min|minimum)\s+(\d+)?\s*(salaries|salary|paid)/i);
        return { intent: 'salary_ranking', entities: { count: m[2] ? parseInt(m[2]) : 5, order: 'ASC' } };
    }

    // Department queries
    if (/\b(all|every|list|show)\s+(departments?|depts?)\b/i.test(lower)) {
        return { intent: 'all_departments', entities: {} };
    }
    if (/\b(department|dept)\s*(analytics|stats|statistics|summary|info)/i.test(lower) || /\b(analytics|stats|statistics|summary)\s*of\s*(.+?)\s*(department|dept)\b/i.test(lower)) {
        let dept = '';
        const m = msg.match(/\b(?:analytics|stats|summary)\s*of\s*(.+?)\s*(?:department|dept)\b/i);
        if (m) dept = m[1].trim();
        return { intent: 'department_analytics', entities: { department: dept } };
    }
    if (/\b(department|dept)\b/i.test(lower)) {
        const m = msg.match(/\b(.+?)\s*(?:department|dept)\b/i);
        let dept = m ? m[1].trim() : '';
        if (/\b(in|of|for)\b/i.test(dept)) dept = dept.replace(/\b(in|of|for)\b/ig, '').trim();
        const skip = ['all', 'every', 'list', 'show', 'any', 'the', 'my', 'his', 'her', 'our'];
        if (skip.includes(dept.toLowerCase())) dept = '';
        return { intent: 'department_list', entities: { department: dept } };
    }

    // Payroll queries
    if (/\b(pending|unpaid|due)\s*(payroll|salary|payment)\b/i.test(lower)) return { intent: 'payroll_pending', entities: {} };
    if (/\b(today|today\'s)\s*(payroll|salary|payment|paid)\b/i.test(lower) || /\b(paid|processed)\s*(today)\b/i.test(lower)) return { intent: 'payroll_today', entities: {} };
    if (/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(lower) && /\b(payroll|salary)\b/i.test(lower)) {
        const m = msg.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
        return { intent: 'payroll_month', entities: { month: m[1] } };
    }
    if (/\b(recent|latest|last)\s*(payroll|salary|payment|paid)\b/i.test(lower)) {
        const m = lower.match(/(?:top|last|recent)\s+(\d+)/i);
        return { intent: 'recent_payroll', entities: { count: m ? parseInt(m[1]) : 10 } };
    }

    // Staff count
    if (/\b(how many|count|total|number of)\s*(staff|employees|people|workers)\b/i.test(lower)) return { intent: 'staff_count', entities: {} };

    // Extract Name function
    const extractName = (original, l) => {
        let m = original.match(/(?:of|for)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
        if (m) {
            const n = m[1].trim().toLowerCase();
            if (!['all', 'every', 'department', 'payroll', 'staff'].includes(n)) return m[1].trim();
        }
        m = original.match(/([a-zA-Z]+)(?:'s|s')\s/i);
        if (m) {
            const n = m[1].trim().toLowerCase();
            if (!['all', 'every', 'department'].includes(n)) return m[1].trim();
        }
        m = original.match(/(?:show|search|find|get|display|view|details?)\s+(?:employee\s+|staff\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
        if (m) {
            const name = m[1].trim();
            const skip = ['department', 'payroll', 'salary', 'all', 'staff', 'employee', 'total', 'monthly', 'summary', 'status', 'leave', 'attendance', 'analytics', 'report', 'recent', 'pending', 'paid', 'slips'];
            if (!skip.includes(name.toLowerCase())) return name;
        }
        m = original.match(/([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:details?|salary|info|information|leave|attendance|payroll)/i);
        if (m) {
            const n = m[1].trim().toLowerCase();
            const skip = ['show', 'get', 'find', 'my', 'his', 'her', 'their', 'the', 'all', 'any'];
            if (!skip.includes(n)) return m[1].trim();
        }
        m = l.match(/\b(?:employee|emp|id|staff)\s*(?:id|#|no|number)?\s*:?\s*(\d{2,6})\b/i);
        if (m) return m[1];
        
        // Final fallback for single word names (like "rahul")
        if (/^[a-zA-Z]+$/.test(original.trim())) {
            const word = original.trim();
            const skip = ['hi','hello','help','staff','payroll','salary','department','dashboard','summary','leave','attendance'];
            if (!skip.includes(word.toLowerCase())) return word;
        }
        
        return null;
    };

    const name = extractName(msg, lower);

    if (/\b(leave|cl|casual\s*leave|medical\s*leave|personal\s*leave|sick\s*leave|remaining|balance)\b/i.test(lower)) {
        if (name) return { intent: 'leave_info', entities: { name } };
    }
    if (/\b(attendance|working\s*days|absent|present)\b/i.test(lower)) {
        if (name) return { intent: 'attendance', entities: { name } };
    }
    if (/\b(salary|pay|gross|net|basic|earning|income|final.salary|deduction)\b/i.test(lower)) {
        if (name) return { intent: 'salary_info', entities: { name } };
        if (/\b(total|overall|all)\b/i.test(lower)) return { intent: 'dashboard_summary', entities: {} };
    }
    
    if (/\b(payroll|payment)\s*(status|summary|overview)/i.test(lower)) return { intent: 'payroll_status', entities: {} };
    if (/\b(monthly|month)\s*(analytics|trend|report|summary)/i.test(lower)) return { intent: 'monthly_analytics', entities: {} };
    if (/\b(salary\s*slip|pay\s*slip|slip)\b/i.test(lower)) return { intent: 'salary_slips', entities: {} };

    if (/\b(total|overall|all|dashboard)\s*(summary|overview)/i.test(lower)) return { intent: 'dashboard_summary', entities: {} };

    if (name) return { intent: 'employee_search', entities: { name } };

    if (/\b(id|employee.?id|emp.?id|staff.?id)\s*:?\s*(\d+)\b/i.test(lower)) {
        const m = lower.match(/\b(id|employee.?id|emp.?id|staff.?id)\s*:?\s*(\d+)\b/i);
        return { intent: 'employee_search', entities: { employee_id: m[2] } };
    }
    if (/^\d{2,6}$/.test(msg.trim())) return { intent: 'employee_search', entities: { employee_id: msg.trim() } };
    
    return result;
};

const findEmployees = async (search, limit = 10) => {
    if (/^\d+$/.test(search)) {
        return await safeQuery(
            `SELECT s.*, p.gross_salary, p.final_salary, p.deduction, p.payment_status, p.paid_date,
                    p.payroll_month, p.payroll_year, p.basic, p.hra, p.da, p.allowance, p.pf, p.tax,
                    p.working_days, p.cl_used, p.medical_used, p.personal_leave
             FROM staff s
             LEFT JOIN payroll p ON p.staff_id = s.id
             WHERE s.employee_id = ? OR s.id = ?
             ORDER BY p.created_at DESC LIMIT ?`, [search, search, limit]
        );
    }
    return await safeQuery(
        `SELECT s.*, p.gross_salary, p.final_salary, p.deduction, p.payment_status, p.paid_date,
                p.payroll_month, p.payroll_year, p.basic, p.hra, p.da, p.allowance, p.pf, p.tax,
                p.working_days, p.cl_used, p.medical_used, p.personal_leave
         FROM staff s
         LEFT JOIN payroll p ON p.staff_id = s.id
         WHERE s.name LIKE ? OR s.name LIKE ?
         ORDER BY 
            CASE WHEN LOWER(s.name) = LOWER(?) THEN 0
                 WHEN LOWER(s.name) LIKE ? THEN 1
                 ELSE 2 END,
            p.created_at DESC
         LIMIT ?`, [`${search}%`, `%${search}%`, search, `${search}%`, limit]
    );
};

const formatNumber = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatEmployeeCard = (emp) => {
    return {
        type: 'card',
        title: '👤 ' + emp.name,
        data: [
            { label: 'Employee Name', value: emp.name },
            { label: 'Employee ID', value: emp.employee_id },
            { label: 'Department', value: emp.department },
            { label: 'Section', value: emp.section || '-' },
            { label: 'Role', value: emp.role },
            { label: 'Payroll Month', value: (emp.payroll_month || '-') + ' ' + (emp.payroll_year || '') },
            { label: 'Gross Salary', value: '₹' + formatNumber(emp.gross_salary) },
            { label: 'Deduction', value: '₹' + formatNumber(emp.deduction) },
            { label: 'Net Salary', value: '₹' + formatNumber(emp.final_salary) },
            { label: 'Payment Status', value: (emp.payment_status || 'N/A').toUpperCase() },
            { label: 'Paid Date', value: emp.paid_date || '-' },
            { label: 'CL Used', value: emp.cl_used || 0 },
            { label: 'Medical Leave', value: emp.medical_used || 0 },
            { label: 'Personal Leave', value: emp.personal_leave || 0 },
            { label: 'Working Days', value: emp.working_days || 30 }
        ],
        message: `Here are the details for ${emp.name} (ID: ${emp.employee_id}).`
    };
};

const formatEmployeeTable = (results, title) => {
    const rows = [];
    const seen = new Set();
    for (const r of results) {
        const key = r.id + '-' + (r.payroll_month || '');
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
            'Name': r.name,
            'ID': r.employee_id,
            'Department': r.department,
            'Role': r.role,
            'Net Salary': '₹' + formatNumber(r.final_salary),
            'Status': (r.payment_status || 'N/A').toUpperCase()
        });
    }
    return {
        type: 'table',
        title: title,
        columns: ['Name', 'ID', 'Department', 'Role', 'Net Salary', 'Status'],
        rows: rows,
        message: `${rows.length} employees found.`
    };
};

exports.handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.json({ type: 'text', message: 'Please type a question.' });

        const adminId = req.admin.id;
        const ctx = getContext(adminId);

        const classified = await classifyIntent(message);
        let intent = classified.intent;
        let entities = classified.entities;

        if (intent === 'followup') {
            const subIntent = entities.sub_intent || 'employee_search';
            if (!ctx.last_employee_id && !ctx.last_employee_name) {
                return res.json({ type: 'text', message: "I'm not sure who you're referring to. Please mention an employee name first." });
            }
            entities.name = ctx.last_employee_name;
            intent = subIntent;
        }

        ctx.last_intent = intent;

        if (intent === 'greeting') {
            return res.json({ type: 'text', message: 'Hello! 👋 I am your PayNest Pro AI Assistant. How can I help you today?' });
        }
        if (intent === 'help') {
            return res.json({
                type: 'card',
                title: '❓ What I Can Do',
                data: [
                    { label: '👤 Employee Search', value: '"Show Rahul details", "Employee ID 108"' },
                    { label: '🏢 Department', value: '"Computer Department", "Show IT staff"' },
                    { label: '💰 Salary', value: '"Salary of Rahul", "Highest salary", "Top 5"' },
                    { label: '📋 Payroll', value: '"Pending payroll", "May payroll", "Recent paid"' },
                    { label: '🏖️ Leave', value: '"CL of Rahul", "Medical leave of Amit"' },
                    { label: '📅 Attendance', value: '"Working days of Rahul", "Attendance of Amit"' },
                    { label: '📊 Analytics', value: '"Dashboard summary", "Monthly analytics"' },
                    { label: '📉 Deductions', value: '"Top deductions", "Highest deductions"' },
                ],
                message: 'Ask me anything about employees or payroll!'
            });
        }

        if (intent === 'employee_search') {
            const search = entities.name || entities.employee_id;
            if (!search) return res.json({ type: 'text', message: 'Who are you looking for?' });
            const empData = await findEmployees(search);
            if (!empData.length) return res.json({ type: 'text', message: `No employee found for "${search}".` });
            
            ctx.last_employee_name = empData[0].name;
            ctx.last_employee_id = empData[0].id;
            ctx.last_department = empData[0].department;
            
            if (empData.length === 1 || (empData[0].name.toLowerCase() !== (empData[1]?.name || '').toLowerCase() && empData.length <= 3)) {
                return res.json(formatEmployeeCard(empData[0]));
            }
            return res.json(formatEmployeeTable(empData, `Employees matching "${search}"`));
        }

        if (intent === 'salary_info') {
            const search = entities.name;
            if (!search) return res.json({ type: 'text', message: 'Please specify an employee name.' });
            const empData = await findEmployees(search, 5);
            if (!empData.length) return res.json({ type: 'text', message: `No employee found for "${search}".` });
            
            ctx.last_employee_name = empData[0].name;
            ctx.last_employee_id = empData[0].id;
            const emp = empData[0];
            return res.json({
                type: 'card', title: '💰 Salary Details — ' + emp.name,
                data: [
                    { label: 'Employee Name', value: emp.name },
                    { label: 'Employee ID', value: emp.employee_id },
                    { label: 'Basic', value: '₹' + formatNumber(emp.basic) },
                    { label: 'HRA', value: '₹' + formatNumber(emp.hra) },
                    { label: 'Gross Salary', value: '₹' + formatNumber(emp.gross_salary) },
                    { label: 'Deduction', value: '₹' + formatNumber(emp.deduction) },
                    { label: 'Net Salary', value: '₹' + formatNumber(emp.final_salary) }
                ],
                message: `Salary details for ${emp.name}.`
            });
        }

        if (intent === 'leave_info') {
            const search = entities.name;
            if (!search) return res.json({ type: 'text', message: 'Please specify an employee name.' });
            const empData = await findEmployees(search, 5);
            if (!empData.length) return res.json({ type: 'text', message: `No employee found for "${search}".` });
            
            ctx.last_employee_name = empData[0].name;
            ctx.last_employee_id = empData[0].id;
            const emp = empData[0];
            const totalLeave = (emp.cl_used || 0) + (emp.medical_used || 0) + (emp.personal_leave || 0);
            return res.json({
                type: 'card', title: '🏖️ Leave Summary — ' + emp.name,
                data: [
                    { label: 'Employee Name', value: emp.name },
                    { label: 'CL Used', value: emp.cl_used || 0 },
                    { label: 'Medical Leave', value: emp.medical_used || 0 },
                    { label: 'Personal Leave', value: emp.personal_leave || 0 },
                    { label: 'Total Leave Taken', value: totalLeave + ' days' }
                ],
                message: `${emp.name} has taken ${totalLeave} days of leave.`
            });
        }

        if (intent === 'attendance') {
            const search = entities.name;
            if (!search) return res.json({ type: 'text', message: 'Please specify an employee name.' });
            const empData = await findEmployees(search, 5);
            if (!empData.length) return res.json({ type: 'text', message: `No employee found for "${search}".` });
            
            ctx.last_employee_name = empData[0].name;
            ctx.last_employee_id = empData[0].id;
            const emp = empData[0];
            const wd = emp.working_days || 30;
            const totalLeave = (emp.cl_used || 0) + (emp.medical_used || 0) + (emp.personal_leave || 0);
            const present = Math.max(0, wd - totalLeave);
            const rate = wd > 0 ? ((present/wd)*100).toFixed(1) : 0;
            
            return res.json({
                type: 'card', title: '📋 Attendance — ' + emp.name,
                data: [
                    { label: 'Employee Name', value: emp.name },
                    { label: 'Working Days', value: wd },
                    { label: 'Days Present', value: present },
                    { label: 'Total Leave', value: totalLeave + ' days' },
                    { label: 'Attendance Rate', value: rate + '%' }
                ],
                message: `${emp.name} has an attendance rate of ${rate}% with ${present} days present.`
            });
        }

        if (intent === 'dashboard_summary') {
            const sStaff = await safeQuery('SELECT COUNT(*) as cnt FROM staff');
            const sPay = await safeQuery('SELECT SUM(final_salary) as tot, SUM(gross_salary) as grs, SUM(deduction) as ded FROM payroll');
            const sSt = await safeQuery('SELECT payment_status, COUNT(*) as cnt FROM payroll GROUP BY payment_status');
            const sDept = await safeQuery('SELECT COUNT(DISTINCT department) as cnt FROM staff');
            
            const totalStaff = sStaff[0].cnt || 0;
            const totalNet = sPay[0].tot || 0;
            const totalGross = sPay[0].grs || 0;
            const totalDed = sPay[0].ded || 0;
            const depts = sDept[0].cnt || 0;
            let paid = 0, pending = 0;
            sSt.forEach(r => { if(r.payment_status === 'paid') paid = r.cnt; if(r.payment_status === 'pending') pending = r.cnt; });
            const avg = totalStaff ? totalNet / Math.max(1, (paid+pending)) : 0;

            return res.json({
                type: 'summary', title: '📊 Dashboard Summary',
                data: [
                    { label: 'Total Staff', value: formatNumber(totalStaff), icon: '👥' },
                    { label: 'Departments', value: formatNumber(depts), icon: '🏢' },
                    { label: 'Total Gross', value: '₹' + formatNumber(totalGross), icon: '💰' },
                    { label: 'Total Net Salary', value: '₹' + formatNumber(totalNet), icon: '💵' },
                    { label: 'Deductions', value: '₹' + formatNumber(totalDed), icon: '📉' },
                    { label: 'Average Salary', value: '₹' + formatNumber(avg), icon: '📊' },
                    { label: 'Paid', value: formatNumber(paid), icon: '✅' },
                    { label: 'Pending', value: formatNumber(pending), icon: '⏳' }
                ],
                message: `Organization has ${totalStaff} staff across ${depts} departments. Total net salary is ₹${formatNumber(totalNet)}.`
            });
        }
        
        if (intent === 'staff_count') {
            const tot = await safeQuery('SELECT COUNT(*) as cnt FROM staff');
            const byRole = await safeQuery('SELECT role, COUNT(*) as cnt FROM staff GROUP BY role ORDER BY cnt DESC');
            const data = [{ label: 'Total Staff', value: formatNumber(tot[0].cnt), icon: '👥' }];
            byRole.forEach(r => data.push({ label: r.role || 'Unspecified', value: formatNumber(r.cnt), icon: '👤' }));
            return res.json({
                type: 'summary', title: '👥 Staff Count', data,
                message: `Total staff: ${tot[0].cnt}.`
            });
        }
        
        if (intent === 'payroll_status') {
            const st = await safeQuery('SELECT payment_status, COUNT(*) as cnt, SUM(final_salary) as sum FROM payroll GROUP BY payment_status');
            let paid = 0, pending = 0, paidAmt = 0, penAmt = 0;
            st.forEach(r => {
                if(r.payment_status==='paid') { paid = r.cnt; paidAmt = r.sum; }
                if(r.payment_status==='pending') { pending = r.cnt; penAmt = r.sum; }
            });
            const tot = paid+pending;
            const prog = tot > 0 ? ((paid/tot)*100).toFixed(1) : 0;
            return res.json({
                type: 'summary', title: '💰 Payroll Status',
                data: [
                    { label: 'Total Payrolls', value: formatNumber(tot), icon: '📋' },
                    { label: 'Paid', value: formatNumber(paid), icon: '✅' },
                    { label: 'Pending', value: formatNumber(pending), icon: '⏳' },
                    { label: 'Progress', value: prog + '%', icon: '📊' },
                    { label: 'Paid Amount', value: '₹' + formatNumber(paidAmt), icon: '💵' },
                    { label: 'Pending Amount', value: '₹' + formatNumber(penAmt), icon: '💸' },
                ],
                message: `${prog}% processed. ${paid} paid, ${pending} pending.`
            });
        }
        
        if (intent === 'salary_ranking') {
            const count = entities.count || 5;
            const order = entities.order || 'DESC';
            const label = order === 'DESC' ? 'Highest' : 'Lowest';
            const data = await safeQuery(
                `SELECT s.name, s.employee_id, s.department, s.role, p.final_salary
                 FROM staff s JOIN payroll p ON p.staff_id = s.id
                 WHERE p.final_salary > 0 ORDER BY p.final_salary ${order} LIMIT ?`, [count]
            );
            const rows = data.map((d, i) => ({
                '#': i+1, 'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
                'Role': d.role, 'Net Salary': '₹'+formatNumber(d.final_salary)
            }));
            return res.json({
                type: 'table', title: `🏆 Top ${count} ${label} Salaries`,
                columns: ['#', 'Name', 'ID', 'Department', 'Role', 'Net Salary'],
                rows, message: `Showing the top ${count} ${label} paid employees.`
            });
        }
        
        if (intent === 'top_deductions') {
            const count = entities.count || 5;
            const data = await safeQuery(
                `SELECT s.name, s.employee_id, s.department, p.deduction, p.final_salary
                 FROM staff s JOIN payroll p ON p.staff_id = s.id
                 WHERE p.deduction > 0 ORDER BY p.deduction DESC LIMIT ?`, [count]
            );
            const rows = data.map((d, i) => ({
                '#': i+1, 'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
                'Deduction': '₹'+formatNumber(d.deduction), 'Net Salary': '₹'+formatNumber(d.final_salary)
            }));
            return res.json({
                type: 'table', title: `📉 Top ${count} Deductions`,
                columns: ['#', 'Name', 'ID', 'Department', 'Deduction', 'Net Salary'],
                rows, message: `Showing employees with the ${count} highest deductions.`
            });
        }
        
        if (intent === 'payroll_pending') {
            const data = await safeQuery(
                `SELECT s.name, s.employee_id, s.department, p.final_salary, p.payroll_month, p.payroll_year
                 FROM staff s JOIN payroll p ON p.staff_id = s.id
                 WHERE p.payment_status = 'pending' ORDER BY p.final_salary DESC LIMIT 50`
            );
            if (!data.length) return res.json({ type: 'text', message: '✅ All payrolls processed. No pending payments.' });
            const rows = data.map(d => ({
                'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
                'Month': (d.payroll_month||'')+' '+(d.payroll_year||''), 'Amount': '₹'+formatNumber(d.final_salary)
            }));
            return res.json({
                type: 'table', title: '⏳ Pending Payroll',
                columns: ['Name', 'ID', 'Department', 'Month', 'Amount'],
                rows, message: `${data.length} employees have pending salary payments.`
            });
        }

        if (intent === 'all_departments') {
            const data = await safeQuery(
                `SELECT s.department, COUNT(DISTINCT s.id) as staff_count, SUM(p.final_salary) as total_salary, AVG(p.final_salary) as avg_salary
                 FROM staff s LEFT JOIN payroll p ON p.staff_id = s.id
                 GROUP BY s.department ORDER BY total_salary DESC`
            );
            const rows = data.map(d => ({
                'Department': d.department, 'Staff': d.staff_count,
                'Total Salary': '₹'+formatNumber(d.total_salary), 'Avg Salary': '₹'+formatNumber(d.avg_salary)
            }));
            return res.json({
                type: 'table', title: '📊 Department Analytics',
                columns: ['Department', 'Staff', 'Total Salary', 'Avg Salary'],
                rows, message: `Analytics across all ${data.length} departments.`
            });
        }
        
        if (intent === 'department_list') {
            const dept = entities.department;
            if (!dept) {
                const data = await safeQuery('SELECT department, COUNT(*) as staff_count FROM staff GROUP BY department ORDER BY department');
                const rows = data.map(d => ({ 'Department': d.department, 'Staff Count': d.staff_count }));
                return res.json({
                    type: 'table', title: '🏢 All Departments',
                    columns: ['Department', 'Staff Count'], rows, message: `There are ${data.length} departments.`
                });
            }
            ctx.last_department = dept;
            const staff = await safeQuery(
                `SELECT s.name, s.employee_id, s.role, s.section, s.department
                 FROM staff s WHERE s.department LIKE ? ORDER BY s.name LIMIT 50`, [`%${dept}%`]
            );
            if (!staff.length) return res.json({ type: 'text', message: `No staff found in "${dept}".` });
            const rows = staff.map(s => ({ 'Name': s.name, 'ID': s.employee_id, 'Role': s.role, 'Section': s.section }));
            return res.json({
                type: 'table', title: `🏢 ${dept} Department`,
                columns: ['Name', 'ID', 'Role', 'Section'], rows, message: `Found ${staff.length} staff in ${dept}.`
            });
        }

        if (intent === 'department_analytics') {
            const dept = entities.department;
            if (!dept) return res.json({ type: 'text', message: 'Which department?' });
            ctx.last_department = dept;
            const stats = await safeQuery(
                `SELECT COUNT(DISTINCT s.id) as total_staff, SUM(p.gross_salary) as total_gross,
                        SUM(p.final_salary) as total_net, SUM(p.deduction) as total_deductions,
                        AVG(p.final_salary) as avg_salary, MAX(p.final_salary) as max_salary, MIN(p.final_salary) as min_salary,
                        SUM(CASE WHEN p.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                        SUM(CASE WHEN p.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count
                 FROM staff s LEFT JOIN payroll p ON p.staff_id = s.id WHERE s.department LIKE ?`, [`%${dept}%`]
            );
            const s = stats[0] || {};
            return res.json({
                type: 'card', title: `📊 Analytics — ${dept}`,
                data: [
                    { label: 'Total Staff', value: s.total_staff || 0 },
                    { label: 'Total Gross', value: '₹'+formatNumber(s.total_gross) },
                    { label: 'Total Net Salary', value: '₹'+formatNumber(s.total_net) },
                    { label: 'Total Deductions', value: '₹'+formatNumber(s.total_deductions) },
                    { label: 'Average Salary', value: '₹'+formatNumber(s.avg_salary) },
                    { label: 'Highest Salary', value: '₹'+formatNumber(s.max_salary) },
                    { label: 'Lowest Salary', value: '₹'+formatNumber(s.min_salary) },
                    { label: 'Paid', value: s.paid_count || 0 },
                    { label: 'Pending', value: s.pending_count || 0 }
                ],
                message: `${dept} has ${s.total_staff || 0} staff.`
            });
        }

        return res.json({ type: 'text', message: "I'm not sure how to answer that. Try asking about employees, salaries, payroll, leaves, attendance, or departments. Type \"help\" to see what I can do!" });

    } catch (err) {
        console.error('AI Error:', err);
        return res.status(500).json({ type: 'text', message: 'I encountered an error processing that.' });
    }
};
