const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/db');
const dotenv = require('dotenv');
dotenv.config();

// ─── GEMINI INITIALIZATION ────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BLOCKED_SQL_PATTERN = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|RENAME|SHOW\s+DATABASES|LOAD|CALL|EXEC)\b/i;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 20;
const CACHE_MAX = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── SAFE QUERY EXECUTOR ──────────────────────────────────────────────────────
const safeQuery = async (query, params = []) => {
    if (BLOCKED_SQL_PATTERN.test(query)) {
        throw new Error('Only SELECT queries are allowed. Destructive operations are blocked.');
    }
    const [rows] = await pool.query(query, params);
    return rows;
};

// ─── QUERY CACHE (LRU) ───────────────────────────────────────────────────────
const queryCache = new Map();

const getCacheKey = (intent, entities) => {
    return `${intent}:${JSON.stringify(entities)}`;
};

const getCachedResult = (key) => {
    const entry = queryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        queryCache.delete(key);
        return null;
    }
    return entry.data;
};

const setCachedResult = (key, data) => {
    if (queryCache.size >= CACHE_MAX) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
    }
    queryCache.set(key, { data, timestamp: Date.now() });
};

// ─── CONVERSATION MEMORY ─────────────────────────────────────────────────────
const sessions = {};

const getSession = (adminId) => {
    if (!sessions[adminId]) {
        sessions[adminId] = {
            history: [],
            last_employee_name: null,
            last_employee_id: null,
            last_department: null,
            last_activity: Date.now()
        };
    }
    const session = sessions[adminId];
    // Check expiry
    if (Date.now() - session.last_activity > SESSION_TIMEOUT_MS) {
        session.history = [];
        session.last_employee_name = null;
        session.last_employee_id = null;
        session.last_department = null;
    }
    session.last_activity = Date.now();
    return session;
};

const addToHistory = (session, role, content) => {
    session.history.push({ role, content });
    if (session.history.length > MAX_HISTORY) {
        session.history = session.history.slice(-MAX_HISTORY);
    }
};

// ─── AI AUDIT LOGGING ─────────────────────────────────────────────────────────
const logAIQuery = async (adminId, question, intent, sql, execTimeMs, responseType, success, ipAddress) => {
    try {
        await pool.query(
            `INSERT INTO ai_logs (admin_id, question, detected_intent, generated_sql, execution_time_ms, response_type, success, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminId, question, intent || '', sql || '', execTimeMs || 0, responseType || '', success ? 1 : 0, ipAddress || '']
        );
    } catch (e) {
        console.error('AI log insert failed:', e.message);
    }
};

// ─── GEMINI SYSTEM PROMPT ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are "PayNest AI", an intelligent payroll assistant for PayNest Pro — a payroll management system for educational institutions.

DATABASE SCHEMA (READ ONLY — you must NEVER suggest modifications):
- staff: id, employee_id (VARCHAR like EMP-001), name, role, department, section, qualification, salary_type, created_at
- payroll: id, staff_id (FK→staff.id), payroll_month, payroll_year, basic, hra, da, allowance, pf, tax, working_days, cl_used, medical_used, personal_leave, gross_salary, deduction, final_salary, payment_status (paid/pending), paid_date, paid_time, transaction_id, slip_generated, created_at
- admins: id, name, email, password, role, created_at
- admin_logs: id, admin_id (FK→admins.id), action, ip_address, created_at
- activity_logs: id, activity_type, message, staff_id, department, created_at
- salary_slips: id, slip_id, verification_token, staff_id, payroll_id, pdf_path, generated_at

LEAVE RULES:
- CL quota: 8 days per cycle
- Medical leave quota: 2 days per cycle
- Personal leave: fully unpaid
- Extra CL/Medical beyond quota → unpaid

YOUR TASK:
Analyze the user's message and return a JSON object with these fields:
{
  "intent": "<one of the supported intents>",
  "entities": { <relevant entities> },
  "response_text": "<natural, human-like response text in the user's language>"
}

SUPPORTED INTENTS AND THEIR ENTITIES:
1. "greeting" — entities: {} — User says hi/hello/namaste etc.
2. "help" — entities: {} — User asks what you can do
3. "employee_search" — entities: { "name": "...", "employee_id": "..." } — Search by name or ID
4. "salary_info" — entities: { "name": "..." } — Salary details for an employee
5. "leave_info" — entities: { "name": "..." } — Leave summary for an employee
6. "attendance" — entities: { "name": "..." } — Attendance info for an employee
7. "department_list" — entities: { "department": "..." } — Staff in a department (empty = all depts)
8. "department_analytics" — entities: { "department": "..." } — Analytics for a dept
9. "all_departments" — entities: {} — List all departments with stats
10. "payroll_pending" — entities: {} — Show all pending payrolls
11. "payroll_today" — entities: {} — Payrolls processed today
12. "payroll_month" — entities: { "month": "..." } — Payroll for a specific month
13. "payroll_status" — entities: {} — Overall payroll status summary
14. "recent_payroll" — entities: { "count": 10 } — Recent payroll records
15. "salary_ranking" — entities: { "count": 5, "order": "DESC" } — Top/bottom salaries (order: DESC=highest, ASC=lowest)
16. "top_deductions" — entities: { "count": 5 } — Employees with highest deductions
17. "staff_count" — entities: {} — Total staff count by role
18. "dashboard_summary" — entities: {} — Overall organization summary
19. "monthly_analytics" — entities: {} — Monthly payroll trend
20. "role_search" — entities: { "role": "..." } — Search by role (HOD, Professor, Principal, etc.)
21. "section_summary" — entities: {} — Section-wise payroll summary
22. "salary_slips" — entities: {} — Salary slip information
23. "followup" — entities: { "sub_intent": "..." } — Follow-up about previously discussed employee. sub_intent can be: employee_search, salary_info, leave_info, attendance
24. "unknown" — entities: {} — Cannot understand the query

LANGUAGE RULES:
- Understand English, Hindi (Devanagari or transliterated), and Hinglish (mixed Hindi-English)
- Examples: "salary kitni hai" = salary_info, "CL kitni bachi" = leave_info, "kitne staff hai" = staff_count
- "ki salary" / "ka department" / "ko payment mila" = followup or direct queries
- Respond in the SAME language the user uses. If they use Hinglish, respond in Hinglish.

NAME HANDLING:
- If the user mentions a name (even misspelled), extract it in the "name" entity
- Common misspellings: "Rahool"→"Rahul", "Divya"→"Divya", etc.
- Extract the name AS THE USER TYPED IT — the backend will do fuzzy matching
- Single words like "Rahul" with no other context = employee_search

CONVERSATION CONTEXT:
- If the user says "his salary", "her department", "uski CL", "salary?", "department?" without a name, it's a FOLLOWUP about the last discussed employee
- Set intent to "followup" with appropriate sub_intent

CRITICAL RULES:
- NEVER generate SQL queries
- NEVER suggest database modifications
- NEVER reveal database credentials or schema details to the user
- ALWAYS return valid JSON
- Keep response_text concise, professional, and friendly
- Use emojis sparingly for warmth`;

// ─── GEMINI NLU ENGINE ────────────────────────────────────────────────────────
const classifyWithGemini = async (message, session) => {
    try {
        // Build conversation context for Gemini
        const contextMessages = session.history.slice(-10).map(h =>
            `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
        ).join('\n');

        let contextInfo = '';
        if (session.last_employee_name) {
            contextInfo += `\nLast discussed employee: ${session.last_employee_name}`;
        }
        if (session.last_department) {
            contextInfo += `\nLast discussed department: ${session.last_department}`;
        }

        const userPrompt = `${contextMessages ? 'CONVERSATION HISTORY:\n' + contextMessages + '\n\n' : ''}${contextInfo ? 'CONTEXT:' + contextInfo + '\n\n' : ''}USER MESSAGE: "${message}"

Return ONLY a valid JSON object with intent, entities, and response_text. No markdown, no code blocks, no extra text.`;

        const result = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json'
            }
        });

        const responseText = result.response.text().trim();
        
        // Parse JSON response
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            // Try to extract JSON from response if wrapped in markdown
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid JSON from Gemini');
            }
        }

        return {
            intent: parsed.intent || 'unknown',
            entities: parsed.entities || {},
            response_text: parsed.response_text || ''
        };
    } catch (error) {
        console.error('Gemini classification error:', error.message);
        // Fallback to regex-based classification
        return fallbackClassify(message);
    }
};

// ─── REGEX FALLBACK (when Gemini is unavailable) ──────────────────────────────
const fallbackClassify = (msg) => {
    const lower = msg.toLowerCase().trim();

    if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|namaste|namaskar)/i.test(lower)) {
        return { intent: 'greeting', entities: {}, response_text: 'Hello! 👋 I am your PayNest Pro AI Assistant. How can I help you today?' };
    }
    if (/^(help|what can you do|how to use|commands|kya kar sakte)/i.test(lower)) {
        return { intent: 'help', entities: {}, response_text: 'Here\'s what I can help you with!' };
    }
    if (/\b(he|she|his|her|him|uski|uska|unki|unka)\b/i.test(lower)) {
        let subIntent = 'employee_search';
        if (/\b(leave|cl|medical|sick|chutti)\b/i.test(lower)) subIntent = 'leave_info';
        else if (/\b(attendance|present|absent|haazri|hajri)\b/i.test(lower)) subIntent = 'attendance';
        else if (/\b(salary|pay|gross|net|tankhwah|vetan)\b/i.test(lower)) subIntent = 'salary_info';
        return { intent: 'followup', entities: { sub_intent: subIntent }, response_text: '' };
    }
    if (/\b(top|highest|max|maximum|sabse\s*(jyada|zyada))\s*(\d+)?\s*(deductions?|cuts?|katauti)/i.test(lower)) {
        const m = lower.match(/(top|highest|max|maximum|sabse\s*(?:jyada|zyada))\s*(\d+)?/i);
        return { intent: 'top_deductions', entities: { count: m && m[2] ? parseInt(m[2]) : 5 }, response_text: '' };
    }
    if (/\b(top|highest|max|maximum|sabse\s*(jyada|zyada))\s*(\d+)?\s*(salaries|salary|paid|tankhwah)/i.test(lower)) {
        const m = lower.match(/(top|highest|max|maximum)\s*(\d+)?/i);
        return { intent: 'salary_ranking', entities: { count: m && m[2] ? parseInt(m[2]) : 5, order: 'DESC' }, response_text: '' };
    }
    if (/\b(bottom|lowest|min|minimum|sabse\s*kam)\s*(\d+)?\s*(salaries|salary|paid|tankhwah)/i.test(lower)) {
        const m = lower.match(/(bottom|lowest|min|minimum)\s*(\d+)?/i);
        return { intent: 'salary_ranking', entities: { count: m && m[2] ? parseInt(m[2]) : 5, order: 'ASC' }, response_text: '' };
    }
    if (/\b(pending|unpaid|due|baki)\s*(payroll|salary|payment)/i.test(lower)) {
        return { intent: 'payroll_pending', entities: {}, response_text: '' };
    }
    if (/\b(how many|count|total|number of|kitne)\s*(staff|employees|people|workers|log)/i.test(lower)) {
        return { intent: 'staff_count', entities: {}, response_text: '' };
    }
    if (/\b(dashboard|summary|overview)\b/i.test(lower)) {
        return { intent: 'dashboard_summary', entities: {}, response_text: '' };
    }

    // Try to extract a name
    const name = extractNameFallback(msg, lower);
    if (name) {
        if (/\b(leave|cl|medical|sick|chutti)\b/i.test(lower)) return { intent: 'leave_info', entities: { name }, response_text: '' };
        if (/\b(attendance|present|absent|working\s*days|haazri)\b/i.test(lower)) return { intent: 'attendance', entities: { name }, response_text: '' };
        if (/\b(salary|pay|gross|net|tankhwah|vetan)\b/i.test(lower)) return { intent: 'salary_info', entities: { name }, response_text: '' };
        return { intent: 'employee_search', entities: { name }, response_text: '' };
    }

    if (/^\d{2,6}$/.test(msg.trim())) {
        return { intent: 'employee_search', entities: { employee_id: msg.trim() }, response_text: '' };
    }

    return { intent: 'unknown', entities: {}, response_text: "I'm not sure how to answer that. Try asking about employees, salaries, payroll, leaves, attendance, or departments. Type \"help\" to see what I can do!" };
};

const extractNameFallback = (original, lower) => {
    let m = original.match(/(?:of|for)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    if (m) {
        const n = m[1].trim().toLowerCase();
        if (!['all', 'every', 'department', 'payroll', 'staff'].includes(n)) return m[1].trim();
    }
    m = original.match(/(?:show|search|find|get|display|view|details?)\s+(?:employee\s+|staff\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    if (m) {
        const name = m[1].trim();
        const skip = ['department', 'payroll', 'salary', 'all', 'staff', 'employee', 'total', 'monthly', 'summary', 'status', 'leave', 'attendance', 'analytics', 'report', 'recent', 'pending', 'paid', 'slips', 'dashboard'];
        if (!skip.includes(name.toLowerCase())) return name;
    }
    m = original.match(/([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:details?|salary|info|information|leave|attendance|payroll)/i);
    if (m) {
        const n = m[1].trim().toLowerCase();
        const skip = ['show', 'get', 'find', 'my', 'his', 'her', 'their', 'the', 'all', 'any', 'pending', 'paid', 'total', 'monthly', 'dashboard'];
        if (!skip.includes(n)) return m[1].trim();
    }
    if (/^[a-zA-Z]+$/.test(original.trim())) {
        const word = original.trim();
        const skip = ['hi', 'hello', 'help', 'staff', 'payroll', 'salary', 'department', 'dashboard', 'summary', 'leave', 'attendance', 'namaste', 'hey', 'pending', 'paid'];
        if (!skip.includes(word.toLowerCase())) return word;
    }
    return null;
};

// ─── FUZZY NAME MATCHING ──────────────────────────────────────────────────────
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

    // First try exact and prefix match
    let results = await safeQuery(
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

    // If no results, try SOUNDEX matching (phonetic/fuzzy)
    if (results.length === 0) {
        results = await safeQuery(
            `SELECT s.*, p.gross_salary, p.final_salary, p.deduction, p.payment_status, p.paid_date,
                    p.payroll_month, p.payroll_year, p.basic, p.hra, p.da, p.allowance, p.pf, p.tax,
                    p.working_days, p.cl_used, p.medical_used, p.personal_leave
             FROM staff s
             LEFT JOIN payroll p ON p.staff_id = s.id
             WHERE SOUNDEX(s.name) = SOUNDEX(?)
             ORDER BY p.created_at DESC
             LIMIT ?`, [search, limit]
        );
    }

    return results;
};

// Find similar names for suggestions
const findSimilarNames = async (search, limit = 5) => {
    try {
        const allNames = await safeQuery('SELECT DISTINCT name FROM staff');
        const searchLower = search.toLowerCase();

        const scored = allNames.map(row => ({
            name: row.name,
            distance: levenshteinDistance(searchLower, row.name.toLowerCase())
        })).sort((a, b) => a.distance - b.distance);

        return scored.slice(0, limit).filter(s => s.distance <= Math.max(3, Math.ceil(search.length * 0.5)));
    } catch {
        return [];
    }
};

// Levenshtein distance algorithm
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// ─── RESPONSE FORMATTERS ──────────────────────────────────────────────────────
const formatNumber = (num) => Number(num || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatEmployeeCard = (emp, geminiText) => {
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
        message: geminiText || `Here are the details for ${emp.name} (ID: ${emp.employee_id}).`
    };
};

const formatEmployeeTable = (results, title, geminiText) => {
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
        message: geminiText || `${rows.length} employees found.`
    };
};

// ─── INTENT HANDLERS ──────────────────────────────────────────────────────────
const handleIntent = async (intent, entities, session, geminiText) => {
    switch (intent) {
        case 'greeting':
            return {
                type: 'text',
                message: geminiText || 'Hello! 👋 I am your PayNest Pro AI Assistant. How can I help you today?',
                suggestions: ['Show dashboard summary', 'Total staff count', 'Pending payroll', 'Top 5 salaries']
            };

        case 'help':
            return {
                type: 'card',
                title: '❓ What I Can Do',
                data: [
                    { label: '👤 Employee Search', value: '"Show Rahul", "Rahul ki details", "Employee ID EMP-001"' },
                    { label: '🏢 Department', value: '"Computer Department", "Mechanical staff", "All HODs"' },
                    { label: '💰 Salary', value: '"Rahul ki salary", "Highest salary", "Top 10", "Sabse kam salary"' },
                    { label: '📋 Payroll', value: '"Pending payroll", "August payroll", "Aaj ka payment"' },
                    { label: '🏖️ Leave', value: '"Rahul ki CL", "Medical leave kitni bachi"' },
                    { label: '📅 Attendance', value: '"Rahul ka attendance", "Working days"' },
                    { label: '📊 Analytics', value: '"Dashboard summary", "Monthly trend", "Department analytics"' },
                    { label: '📉 Deductions', value: '"Top deductions", "Sabse jyada katauti"' },
                    { label: '🗣️ Languages', value: 'English, Hindi, Hinglish — sab samajhta hoon!' },
                ],
                message: geminiText || 'Ask me anything about employees or payroll! I understand English, Hindi, and Hinglish. 🚀',
                suggestions: ['Dashboard summary', 'Total staff', 'Pending payroll', 'Top 5 salaries']
            };

        case 'employee_search':
            return await handleEmployeeSearch(entities, session, geminiText);

        case 'salary_info':
            return await handleSalaryInfo(entities, session, geminiText);

        case 'leave_info':
            return await handleLeaveInfo(entities, session, geminiText);

        case 'attendance':
            return await handleAttendance(entities, session, geminiText);

        case 'dashboard_summary':
            return await handleDashboardSummary(geminiText);

        case 'staff_count':
            return await handleStaffCount(geminiText);

        case 'payroll_status':
            return await handlePayrollStatus(geminiText);

        case 'payroll_pending':
            return await handlePayrollPending(geminiText);

        case 'payroll_today':
            return await handlePayrollToday(geminiText);

        case 'payroll_month':
            return await handlePayrollMonth(entities, geminiText);

        case 'recent_payroll':
            return await handleRecentPayroll(entities, geminiText);

        case 'salary_ranking':
            return await handleSalaryRanking(entities, geminiText);

        case 'top_deductions':
            return await handleTopDeductions(entities, geminiText);

        case 'all_departments':
            return await handleAllDepartments(geminiText);

        case 'department_list':
            return await handleDepartmentList(entities, session, geminiText);

        case 'department_analytics':
            return await handleDepartmentAnalytics(entities, session, geminiText);

        case 'role_search':
            return await handleRoleSearch(entities, geminiText);

        case 'section_summary':
            return await handleSectionSummary(geminiText);

        case 'monthly_analytics':
            return await handleMonthlyAnalytics(geminiText);

        case 'salary_slips':
            return {
                type: 'text',
                message: geminiText || 'You can generate and manage salary slips from the Salary Slips page. Go to 💵 Salary Slips from the sidebar.',
                suggestions: ['Dashboard summary', 'Pending payroll', 'Recent payments']
            };

        case 'followup':
            return await handleFollowup(entities, session, geminiText);

        default:
            return {
                type: 'text',
                message: geminiText || "I'm not sure how to answer that. Try asking about employees, salaries, payroll, leaves, attendance, or departments. Type \"help\" to see what I can do!",
                suggestions: ['Help', 'Dashboard summary', 'Total staff', 'Pending payroll']
            };
    }
};

// ─── INDIVIDUAL INTENT HANDLERS ───────────────────────────────────────────────

async function handleEmployeeSearch(entities, session, geminiText) {
    const search = entities.name || entities.employee_id;
    if (!search) return { type: 'text', message: geminiText || 'Who are you looking for? Please mention an employee name or ID.', suggestions: ['Show all departments', 'Total staff count'] };

    const empData = await findEmployees(search);
    if (!empData.length) {
        // Find similar names for suggestions
        const similar = await findSimilarNames(search);
        let msg = geminiText || `No employee found for "${search}".`;
        let suggestions = ['Show all staff', 'Help'];
        if (similar.length > 0) {
            const names = similar.map(s => s.name);
            msg += `\n\n💡 Did you mean: ${names.join(', ')}?`;
            suggestions = names.map(n => `Show ${n}`);
        }
        return { type: 'text', message: msg, suggestions };
    }

    session.last_employee_name = empData[0].name;
    session.last_employee_id = empData[0].id;
    session.last_department = empData[0].department;

    if (empData.length === 1 || (empData[0].name.toLowerCase() !== (empData[1]?.name || '').toLowerCase() && empData.length <= 3)) {
        const response = formatEmployeeCard(empData[0], geminiText);
        response.suggestions = [`${empData[0].name} salary`, `${empData[0].name} leave`, `${empData[0].name} attendance`, `${empData[0].department} department`];
        return response;
    }
    const response = formatEmployeeTable(empData, `Employees matching "${search}"`, geminiText);
    response.suggestions = empData.slice(0, 3).map(e => `Show ${e.name} details`);
    return response;
}

async function handleSalaryInfo(entities, session, geminiText) {
    const search = entities.name;
    if (!search) return { type: 'text', message: geminiText || 'Please specify an employee name for salary details.', suggestions: ['Top 5 salaries', 'Highest salary'] };

    const empData = await findEmployees(search, 5);
    if (!empData.length) {
        const similar = await findSimilarNames(search);
        let msg = geminiText || `No employee found for "${search}".`;
        if (similar.length > 0) msg += `\n\n💡 Did you mean: ${similar.map(s => s.name).join(', ')}?`;
        return { type: 'text', message: msg, suggestions: similar.length > 0 ? similar.map(s => `${s.name} salary`) : ['Help'] };
    }

    session.last_employee_name = empData[0].name;
    session.last_employee_id = empData[0].id;
    const emp = empData[0];
    return {
        type: 'card', title: '💰 Salary Details — ' + emp.name,
        data: [
            { label: 'Employee Name', value: emp.name },
            { label: 'Employee ID', value: emp.employee_id },
            { label: 'Basic', value: '₹' + formatNumber(emp.basic) },
            { label: 'HRA', value: '₹' + formatNumber(emp.hra) },
            { label: 'DA', value: '₹' + formatNumber(emp.da) },
            { label: 'Allowance', value: '₹' + formatNumber(emp.allowance) },
            { label: 'Gross Salary', value: '₹' + formatNumber(emp.gross_salary) },
            { label: 'PF', value: '₹' + formatNumber(emp.pf) },
            { label: 'Tax', value: '₹' + formatNumber(emp.tax) },
            { label: 'Deduction', value: '₹' + formatNumber(emp.deduction) },
            { label: 'Net Salary', value: '₹' + formatNumber(emp.final_salary) },
            { label: 'Payment Status', value: (emp.payment_status || 'N/A').toUpperCase() }
        ],
        message: geminiText || `Salary details for ${emp.name} (${emp.employee_id}).`,
        suggestions: [`${emp.name} leave`, `${emp.name} attendance`, `${emp.name} details`]
    };
}

async function handleLeaveInfo(entities, session, geminiText) {
    const search = entities.name;
    if (!search) return { type: 'text', message: geminiText || 'Please specify an employee name for leave details.', suggestions: ['Help'] };

    const empData = await findEmployees(search, 5);
    if (!empData.length) {
        const similar = await findSimilarNames(search);
        let msg = geminiText || `No employee found for "${search}".`;
        if (similar.length > 0) msg += `\n\n💡 Did you mean: ${similar.map(s => s.name).join(', ')}?`;
        return { type: 'text', message: msg, suggestions: similar.length > 0 ? similar.map(s => `${s.name} leave`) : ['Help'] };
    }

    session.last_employee_name = empData[0].name;
    session.last_employee_id = empData[0].id;
    const emp = empData[0];
    const clQuota = 8, medQuota = 2;
    const clRemaining = Math.max(0, clQuota - (emp.cl_used || 0));
    const medRemaining = Math.max(0, medQuota - (emp.medical_used || 0));
    const totalLeave = (emp.cl_used || 0) + (emp.medical_used || 0) + (emp.personal_leave || 0);

    return {
        type: 'card', title: '🏖️ Leave Summary — ' + emp.name,
        data: [
            { label: 'Employee Name', value: emp.name },
            { label: 'CL Used', value: `${emp.cl_used || 0} / ${clQuota}` },
            { label: 'CL Remaining', value: clRemaining },
            { label: 'Medical Leave Used', value: `${emp.medical_used || 0} / ${medQuota}` },
            { label: 'Medical Leave Remaining', value: medRemaining },
            { label: 'Personal Leave', value: emp.personal_leave || 0 },
            { label: 'Total Leave Taken', value: totalLeave + ' days' }
        ],
        message: geminiText || `${emp.name} has taken ${totalLeave} days of leave. CL remaining: ${clRemaining}, Medical remaining: ${medRemaining}.`,
        suggestions: [`${emp.name} salary`, `${emp.name} attendance`, `${emp.name} details`]
    };
}

async function handleAttendance(entities, session, geminiText) {
    const search = entities.name;
    if (!search) return { type: 'text', message: geminiText || 'Please specify an employee name for attendance.', suggestions: ['Help'] };

    const empData = await findEmployees(search, 5);
    if (!empData.length) {
        const similar = await findSimilarNames(search);
        let msg = geminiText || `No employee found for "${search}".`;
        if (similar.length > 0) msg += `\n\n💡 Did you mean: ${similar.map(s => s.name).join(', ')}?`;
        return { type: 'text', message: msg, suggestions: similar.length > 0 ? similar.map(s => `${s.name} attendance`) : ['Help'] };
    }

    session.last_employee_name = empData[0].name;
    session.last_employee_id = empData[0].id;
    const emp = empData[0];
    const wd = emp.working_days || 30;
    const totalLeave = (emp.cl_used || 0) + (emp.medical_used || 0) + (emp.personal_leave || 0);
    const present = Math.max(0, wd - totalLeave);
    const rate = wd > 0 ? ((present / wd) * 100).toFixed(1) : 0;

    return {
        type: 'card', title: '📋 Attendance — ' + emp.name,
        data: [
            { label: 'Employee Name', value: emp.name },
            { label: 'Working Days', value: wd },
            { label: 'Days Present', value: present },
            { label: 'Total Leave', value: totalLeave + ' days' },
            { label: 'Attendance Rate', value: rate + '%' }
        ],
        message: geminiText || `${emp.name} has an attendance rate of ${rate}% with ${present} days present out of ${wd} working days.`,
        suggestions: [`${emp.name} salary`, `${emp.name} leave`, `${emp.name} details`]
    };
}

async function handleDashboardSummary(geminiText) {
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
    sSt.forEach(r => { if (r.payment_status === 'paid') paid = r.cnt; if (r.payment_status === 'pending') pending = r.cnt; });
    const avg = totalStaff ? totalNet / Math.max(1, (paid + pending)) : 0;

    return {
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
        message: geminiText || `Organization has ${totalStaff} staff across ${depts} departments. Total net salary is ₹${formatNumber(totalNet)}.`,
        suggestions: ['Pending payroll', 'Top 5 salaries', 'All departments', 'Monthly trend']
    };
}

async function handleStaffCount(geminiText) {
    const tot = await safeQuery('SELECT COUNT(*) as cnt FROM staff');
    const byRole = await safeQuery('SELECT role, COUNT(*) as cnt FROM staff GROUP BY role ORDER BY cnt DESC');
    const data = [{ label: 'Total Staff', value: formatNumber(tot[0].cnt), icon: '👥' }];
    byRole.forEach(r => data.push({ label: r.role || 'Unspecified', value: formatNumber(r.cnt), icon: '👤' }));
    return {
        type: 'summary', title: '👥 Staff Count', data,
        message: geminiText || `Total staff: ${tot[0].cnt}.`,
        suggestions: ['All departments', 'Dashboard summary', 'All HODs']
    };
}

async function handlePayrollStatus(geminiText) {
    const st = await safeQuery('SELECT payment_status, COUNT(*) as cnt, SUM(final_salary) as sum FROM payroll GROUP BY payment_status');
    let paid = 0, pending = 0, paidAmt = 0, penAmt = 0;
    st.forEach(r => {
        if (r.payment_status === 'paid') { paid = r.cnt; paidAmt = r.sum; }
        if (r.payment_status === 'pending') { pending = r.cnt; penAmt = r.sum; }
    });
    const tot = paid + pending;
    const prog = tot > 0 ? ((paid / tot) * 100).toFixed(1) : 0;
    return {
        type: 'summary', title: '💰 Payroll Status',
        data: [
            { label: 'Total Payrolls', value: formatNumber(tot), icon: '📋' },
            { label: 'Paid', value: formatNumber(paid), icon: '✅' },
            { label: 'Pending', value: formatNumber(pending), icon: '⏳' },
            { label: 'Progress', value: prog + '%', icon: '📊' },
            { label: 'Paid Amount', value: '₹' + formatNumber(paidAmt), icon: '💵' },
            { label: 'Pending Amount', value: '₹' + formatNumber(penAmt), icon: '💸' },
        ],
        message: geminiText || `${prog}% processed. ${paid} paid, ${pending} pending.`,
        suggestions: ['Pending payroll', 'Recent payments', 'Dashboard summary']
    };
}

async function handlePayrollPending(geminiText) {
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, p.final_salary, p.payroll_month, p.payroll_year
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE p.payment_status = 'pending' ORDER BY p.final_salary DESC LIMIT 50`
    );
    if (!data.length) return { type: 'text', message: geminiText || '✅ All payrolls processed! No pending payments.', suggestions: ['Recent payments', 'Dashboard summary'] };
    const rows = data.map(d => ({
        'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
        'Month': (d.payroll_month || '') + ' ' + (d.payroll_year || ''), 'Amount': '₹' + formatNumber(d.final_salary)
    }));
    return {
        type: 'table', title: '⏳ Pending Payroll',
        columns: ['Name', 'ID', 'Department', 'Month', 'Amount'],
        rows, message: geminiText || `${data.length} employees have pending salary payments.`,
        suggestions: ['Payroll status', 'Dashboard summary', 'Recent payments']
    };
}

async function handlePayrollToday(geminiText) {
    const today = new Date().toISOString().split('T')[0];
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, p.final_salary, p.paid_time
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE p.paid_date = ? ORDER BY p.paid_time DESC LIMIT 50`, [today]
    );
    if (!data.length) return { type: 'text', message: geminiText || 'No payments processed today.', suggestions: ['Pending payroll', 'Payroll status'] };
    const rows = data.map(d => ({
        'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
        'Amount': '₹' + formatNumber(d.final_salary), 'Time': d.paid_time || '-'
    }));
    return {
        type: 'table', title: '📅 Today\'s Payments',
        columns: ['Name', 'ID', 'Department', 'Amount', 'Time'],
        rows, message: geminiText || `${data.length} salaries paid today.`,
        suggestions: ['Payroll status', 'Pending payroll', 'Dashboard summary']
    };
}

async function handlePayrollMonth(entities, geminiText) {
    const month = entities.month;
    if (!month) return { type: 'text', message: 'Please specify a month.', suggestions: ['January payroll', 'August payroll'] };
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, p.gross_salary, p.final_salary, p.deduction, p.payment_status
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE LOWER(p.payroll_month) = LOWER(?) ORDER BY p.final_salary DESC LIMIT 50`, [month]
    );
    if (!data.length) return { type: 'text', message: geminiText || `No payroll data found for ${month}.`, suggestions: ['Payroll status', 'Dashboard summary'] };
    const rows = data.map(d => ({
        'Name': d.name, 'ID': d.employee_id, 'Dept': d.department,
        'Gross': '₹' + formatNumber(d.gross_salary), 'Net': '₹' + formatNumber(d.final_salary),
        'Status': (d.payment_status || 'N/A').toUpperCase()
    }));
    const totalNet = data.reduce((sum, d) => sum + (d.final_salary || 0), 0);
    return {
        type: 'table', title: `📅 ${month} Payroll`,
        columns: ['Name', 'ID', 'Dept', 'Gross', 'Net', 'Status'],
        rows, message: geminiText || `${month} payroll: ${data.length} entries, total ₹${formatNumber(totalNet)}.`,
        suggestions: ['Payroll status', 'Pending payroll', 'Dashboard summary']
    };
}

async function handleRecentPayroll(entities, geminiText) {
    const count = entities.count || 10;
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, p.final_salary, p.payment_status, p.paid_date
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE p.payment_status = 'paid' AND p.paid_date IS NOT NULL
         ORDER BY p.paid_date DESC, p.paid_time DESC LIMIT ?`, [count]
    );
    if (!data.length) return { type: 'text', message: geminiText || 'No recent payments found.', suggestions: ['Pending payroll', 'Payroll status'] };
    const rows = data.map(d => ({
        'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
        'Amount': '₹' + formatNumber(d.final_salary), 'Paid Date': d.paid_date || '-'
    }));
    return {
        type: 'table', title: '💸 Recent Payments',
        columns: ['Name', 'ID', 'Department', 'Amount', 'Paid Date'],
        rows, message: geminiText || `Showing ${data.length} recent payments.`,
        suggestions: ['Payroll status', 'Pending payroll', 'Dashboard summary']
    };
}

async function handleSalaryRanking(entities, geminiText) {
    const count = entities.count || 5;
    const order = entities.order || 'DESC';
    const label = order === 'DESC' ? 'Highest' : 'Lowest';
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, s.role, p.final_salary
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE p.final_salary > 0 ORDER BY p.final_salary ${order === 'ASC' ? 'ASC' : 'DESC'} LIMIT ?`, [count]
    );
    const rows = data.map((d, i) => ({
        '#': i + 1, 'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
        'Role': d.role, 'Net Salary': '₹' + formatNumber(d.final_salary)
    }));
    return {
        type: 'table', title: `🏆 Top ${count} ${label} Salaries`,
        columns: ['#', 'Name', 'ID', 'Department', 'Role', 'Net Salary'],
        rows, message: geminiText || `Showing the top ${count} ${label.toLowerCase()} paid employees.`,
        suggestions: [order === 'DESC' ? `Bottom ${count} salaries` : `Top ${count} salaries`, 'Top deductions', 'Dashboard summary']
    };
}

async function handleTopDeductions(entities, geminiText) {
    const count = entities.count || 5;
    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, p.deduction, p.final_salary
         FROM staff s JOIN payroll p ON p.staff_id = s.id
         WHERE p.deduction > 0 ORDER BY p.deduction DESC LIMIT ?`, [count]
    );
    const rows = data.map((d, i) => ({
        '#': i + 1, 'Name': d.name, 'ID': d.employee_id, 'Department': d.department,
        'Deduction': '₹' + formatNumber(d.deduction), 'Net Salary': '₹' + formatNumber(d.final_salary)
    }));
    return {
        type: 'table', title: `📉 Top ${count} Deductions`,
        columns: ['#', 'Name', 'ID', 'Department', 'Deduction', 'Net Salary'],
        rows, message: geminiText || `Showing employees with the ${count} highest deductions.`,
        suggestions: ['Top 5 salaries', 'Lowest 5 salaries', 'Dashboard summary']
    };
}

async function handleAllDepartments(geminiText) {
    const data = await safeQuery(
        `SELECT s.department, COUNT(DISTINCT s.id) as staff_count, SUM(p.final_salary) as total_salary, AVG(p.final_salary) as avg_salary
         FROM staff s LEFT JOIN payroll p ON p.staff_id = s.id
         GROUP BY s.department ORDER BY total_salary DESC`
    );
    const rows = data.map(d => ({
        'Department': d.department, 'Staff': d.staff_count,
        'Total Salary': '₹' + formatNumber(d.total_salary), 'Avg Salary': '₹' + formatNumber(d.avg_salary)
    }));
    return {
        type: 'table', title: '📊 Department Analytics',
        columns: ['Department', 'Staff', 'Total Salary', 'Avg Salary'],
        rows, message: geminiText || `Analytics across all ${data.length} departments.`,
        suggestions: data.slice(0, 3).map(d => `${d.department} department`).concat(['Dashboard summary'])
    };
}

async function handleDepartmentList(entities, session, geminiText) {
    const dept = entities.department;
    if (!dept) {
        const data = await safeQuery('SELECT department, COUNT(*) as staff_count FROM staff GROUP BY department ORDER BY department');
        const rows = data.map(d => ({ 'Department': d.department, 'Staff Count': d.staff_count }));
        return {
            type: 'table', title: '🏢 All Departments',
            columns: ['Department', 'Staff Count'], rows,
            message: geminiText || `There are ${data.length} departments.`,
            suggestions: data.slice(0, 3).map(d => `${d.department} staff`)
        };
    }
    session.last_department = dept;
    const staff = await safeQuery(
        `SELECT s.name, s.employee_id, s.role, s.section, s.department
         FROM staff s WHERE s.department LIKE ? ORDER BY s.name LIMIT 50`, [`%${dept}%`]
    );
    if (!staff.length) return { type: 'text', message: geminiText || `No staff found in "${dept}" department.`, suggestions: ['Show all departments'] };
    const rows = staff.map(s => ({ 'Name': s.name, 'ID': s.employee_id, 'Role': s.role, 'Section': s.section || '-' }));
    return {
        type: 'table', title: `🏢 ${dept} Department`,
        columns: ['Name', 'ID', 'Role', 'Section'], rows,
        message: geminiText || `Found ${staff.length} staff in ${dept}.`,
        suggestions: [`${dept} analytics`, staff.length > 0 ? `Show ${staff[0].name}` : 'Dashboard summary']
    };
}

async function handleDepartmentAnalytics(entities, session, geminiText) {
    const dept = entities.department;
    if (!dept) return { type: 'text', message: geminiText || 'Which department would you like analytics for?', suggestions: ['Show all departments'] };
    session.last_department = dept;
    const stats = await safeQuery(
        `SELECT COUNT(DISTINCT s.id) as total_staff, SUM(p.gross_salary) as total_gross,
                SUM(p.final_salary) as total_net, SUM(p.deduction) as total_deductions,
                AVG(p.final_salary) as avg_salary, MAX(p.final_salary) as max_salary, MIN(p.final_salary) as min_salary,
                SUM(CASE WHEN p.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN p.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count
         FROM staff s LEFT JOIN payroll p ON p.staff_id = s.id WHERE s.department LIKE ?`, [`%${dept}%`]
    );
    const s = stats[0] || {};
    return {
        type: 'card', title: `📊 Analytics — ${dept}`,
        data: [
            { label: 'Total Staff', value: s.total_staff || 0 },
            { label: 'Total Gross', value: '₹' + formatNumber(s.total_gross) },
            { label: 'Total Net Salary', value: '₹' + formatNumber(s.total_net) },
            { label: 'Total Deductions', value: '₹' + formatNumber(s.total_deductions) },
            { label: 'Average Salary', value: '₹' + formatNumber(s.avg_salary) },
            { label: 'Highest Salary', value: '₹' + formatNumber(s.max_salary) },
            { label: 'Lowest Salary', value: '₹' + formatNumber(s.min_salary) },
            { label: 'Paid', value: s.paid_count || 0 },
            { label: 'Pending', value: s.pending_count || 0 }
        ],
        message: geminiText || `${dept} department has ${s.total_staff || 0} staff with total net salary ₹${formatNumber(s.total_net)}.`,
        suggestions: [`${dept} staff list`, 'All departments', 'Dashboard summary']
    };
}

async function handleRoleSearch(entities, geminiText) {
    const role = entities.role;
    if (!role) return { type: 'text', message: geminiText || 'Which role are you looking for? (e.g., HOD, Professor, Principal)', suggestions: ['All HODs', 'All Professors', 'All Principals'] };

    const data = await safeQuery(
        `SELECT s.name, s.employee_id, s.department, s.section, s.role
         FROM staff s WHERE s.role LIKE ? ORDER BY s.department, s.name LIMIT 50`, [`%${role}%`]
    );
    if (!data.length) return { type: 'text', message: geminiText || `No staff found with role "${role}".`, suggestions: ['Show all staff', 'All departments'] };
    const rows = data.map(d => ({
        'Name': d.name, 'ID': d.employee_id, 'Department': d.department, 'Section': d.section || '-', 'Role': d.role
    }));
    return {
        type: 'table', title: `👔 ${role}s`,
        columns: ['Name', 'ID', 'Department', 'Section', 'Role'],
        rows, message: geminiText || `Found ${data.length} staff with role "${role}".`,
        suggestions: ['All departments', 'Dashboard summary', 'Staff count']
    };
}

async function handleSectionSummary(geminiText) {
    const data = await safeQuery(
        `SELECT COALESCE(NULLIF(TRIM(s.section), ''), NULLIF(TRIM(s.department), ''), 'Not Specified') as section_name,
                COUNT(DISTINCT s.id) as staff_count, SUM(p.final_salary) as total_salary, AVG(p.final_salary) as avg_salary
         FROM staff s LEFT JOIN payroll p ON p.staff_id = s.id
         GROUP BY section_name ORDER BY total_salary DESC`
    );
    const rows = data.map(d => ({
        'Section': d.section_name, 'Staff': d.staff_count,
        'Total Salary': '₹' + formatNumber(d.total_salary), 'Avg Salary': '₹' + formatNumber(d.avg_salary)
    }));
    return {
        type: 'table', title: '📊 Section-wise Summary',
        columns: ['Section', 'Staff', 'Total Salary', 'Avg Salary'],
        rows, message: geminiText || `Section-wise payroll summary across ${data.length} sections.`,
        suggestions: ['All departments', 'Dashboard summary', 'Monthly trend']
    };
}

async function handleMonthlyAnalytics(geminiText) {
    const data = await safeQuery(
        `SELECT payroll_month as month, ROUND(SUM(final_salary), 2) as totalPayout,
                COUNT(*) as staff_count, SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END) as paid_count
         FROM payroll WHERE payroll_month IS NOT NULL AND TRIM(payroll_month) != ''
         GROUP BY payroll_month ORDER BY payroll_year DESC, payroll_month`
    );
    if (!data.length) return { type: 'text', message: geminiText || 'No monthly payroll data available.', suggestions: ['Dashboard summary'] };
    const rows = data.map(d => ({
        'Month': d.month, 'Total Payout': '₹' + formatNumber(d.totalPayout),
        'Staff': d.staff_count, 'Paid': d.paid_count
    }));
    return {
        type: 'table', title: '📈 Monthly Payroll Trend',
        columns: ['Month', 'Total Payout', 'Staff', 'Paid'],
        rows, message: geminiText || `Monthly payroll trend across ${data.length} months.`,
        suggestions: ['Dashboard summary', 'Payroll status', 'All departments']
    };
}

async function handleFollowup(entities, session, geminiText) {
    const subIntent = entities.sub_intent || 'employee_search';
    if (!session.last_employee_name && !session.last_employee_id) {
        return {
            type: 'text',
            message: geminiText || "I'm not sure who you're referring to. Please mention an employee name first.",
            suggestions: ['Help', 'Show all staff']
        };
    }
    const newEntities = { ...entities, name: session.last_employee_name };
    return await handleIntent(subIntent, newEntities, session, geminiText);
}

// ─── MAIN CHAT HANDLER ───────────────────────────────────────────────────────
exports.handleChat = async (req, res) => {
    const startTime = Date.now();
    let intent = 'unknown';
    let sqlUsed = '';

    try {
        const { message } = req.body;
        if (!message) return res.json({ type: 'text', message: 'Please type a question.' });

        const adminId = req.admin.id;
        const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';
        const session = getSession(adminId);

        // Add user message to history
        addToHistory(session, 'user', message);

        // Classify with Gemini (or fallback)
        const classified = await classifyWithGemini(message, session);
        intent = classified.intent;
        let entities = classified.entities || {};
        const geminiText = classified.response_text || '';

        // Handle followup intent
        if (intent === 'followup') {
            const subIntent = entities.sub_intent || 'employee_search';
            if (!session.last_employee_name && !session.last_employee_id) {
                const resp = {
                    type: 'text',
                    message: geminiText || "I'm not sure who you're referring to. Please mention an employee name first.",
                    suggestions: ['Help', 'Show all staff']
                };
                addToHistory(session, 'assistant', resp.message);
                await logAIQuery(adminId, message, intent, '', Date.now() - startTime, 'text', true, ipAddress);
                return res.json(resp);
            }
            entities.name = session.last_employee_name;
            intent = subIntent;
        }

        // Check cache
        const cacheKey = getCacheKey(intent, entities);
        const cached = getCachedResult(cacheKey);
        if (cached && intent !== 'greeting' && intent !== 'help' && intent !== 'followup') {
            // Use cached data but with fresh Gemini text
            const cachedResponse = { ...cached };
            if (geminiText) cachedResponse.message = geminiText;
            addToHistory(session, 'assistant', cachedResponse.message);
            await logAIQuery(adminId, message, intent, 'CACHED', Date.now() - startTime, cachedResponse.type, true, ipAddress);
            return res.json(cachedResponse);
        }

        // Execute intent
        const response = await handleIntent(intent, entities, session, geminiText);

        // Update session context from response
        if (response.type === 'card' && response.data) {
            const nameField = response.data.find(d => d.label === 'Employee Name');
            if (nameField) session.last_employee_name = nameField.value;
        }

        // Cache the response
        if (intent !== 'greeting' && intent !== 'help' && intent !== 'followup') {
            setCachedResult(cacheKey, response);
        }

        // Add to history
        addToHistory(session, 'assistant', response.message || '');

        // Log the query
        await logAIQuery(adminId, message, intent, sqlUsed, Date.now() - startTime, response.type, true, ipAddress);

        return res.json(response);

    } catch (err) {
        console.error('AI Error:', err);
        const adminId = req.admin?.id;
        const ipAddress = req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '';
        if (adminId) {
            await logAIQuery(adminId, req.body?.message || '', intent, '', Date.now() - startTime, 'error', false, ipAddress);
        }
        return res.status(500).json({
            type: 'text',
            message: 'I encountered an error processing your request. Please try again.',
            suggestions: ['Help', 'Dashboard summary']
        });
    }
};

// ─── SUGGESTIONS ENDPOINT ─────────────────────────────────────────────────────
exports.getSuggestions = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const session = getSession(adminId);

        let suggestions = ['Show dashboard summary', 'Total staff count', 'Pending payroll', 'Top 5 salaries'];

        if (session.last_employee_name) {
            suggestions = [
                `${session.last_employee_name} salary`,
                `${session.last_employee_name} leave`,
                `${session.last_employee_name} attendance`,
                'Pending payroll',
                'Top 5 salaries'
            ];
        }
        if (session.last_department) {
            suggestions.push(`${session.last_department} analytics`);
        }

        res.json({ suggestions });
    } catch (err) {
        res.json({ suggestions: ['Help', 'Dashboard summary'] });
    }
};

// ─── CLEAR HISTORY ENDPOINT ──────────────────────────────────────────────────
exports.clearHistory = async (req, res) => {
    try {
        const adminId = req.admin.id;
        if (sessions[adminId]) {
            sessions[adminId] = {
                history: [],
                last_employee_name: null,
                last_employee_id: null,
                last_department: null,
                last_activity: Date.now()
            };
        }
        res.json({ success: true, message: 'Conversation history cleared.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear history.' });
    }
};

// ─── AI LOGS ENDPOINT ────────────────────────────────────────────────────────
exports.getLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await safeQuery(
            `SELECT al.*, a.email as admin_email
             FROM ai_logs al
             LEFT JOIN admins a ON a.id = al.admin_id
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]
        );
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM ai_logs');
        res.json({ logs, total: countResult[0].total, limit, offset });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch AI logs.' });
    }
};
