# PayNest Pro

![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

## College Payroll Management System

PayNest Pro is a modern payroll management system developed for colleges and institutions.  
The platform automates salary calculation, attendance deduction, Excel import/export, payroll processing, and salary slip generation in a secure and organized workflow.

---

## 🚀 Project Banner / Intro

**PayNest Pro** is built to simplify monthly payroll operations for educational institutions by centralizing:
- staff records
- attendance-aware salary computation
- payroll lifecycle processing
- salary slip delivery
- analytics-driven decision support

---

## 🧩 Tech Stack

- **Backend:** PHP  
- **Database:** MySQL  
- **Frontend:** HTML, CSS, JavaScript  
- **Libraries:** PhpSpreadsheet, Dompdf  

---

## ✨ Features

- Staff Management
- Excel Import & Export
- Monthly Payroll Cycle
- Attendance-Based Salary
- CL & Medical Leave Quota
- Salary Slip PDF
- Payroll Payment Tracking
- Dashboard Analytics
- Secure Admin Login
- Real-Time Salary Calculation
- Search & Filters

---

## 📸 Screenshots

### Dashboard
`Add dashboard screenshot here`

### Staff Management
`Add staff management screenshot here`

### Salary Slip
`Add salary slip screenshot here`

### Import Export
`Add import/export screenshot here`

---

## 📁 Folder Structure

```bash
PayNest-Pro/
├── assets/
├── config/
├── uploads/
├── templates/
├── database/
├── includes/
├── atiq-payroll-php/
│   ├── auth/
│   ├── payroll/
│   ├── staff/
│   ├── includes/
│   ├── schema.sql
│   ├── dashboard.php
│   └── upload_excel.php
├── node-backend/
└── README.md
```

---

## ⚙️ Installation Guide

1. **Clone repository**
   ```bash
   git clone https://github.com/divyanshuX72/PayNest-Pro.git
   ```
2. **Move project to htdocs** (XAMPP/WAMP)
3. **Start Apache & MySQL**
4. **Create database** from phpMyAdmin
5. **Import SQL file** (`atiq-payroll-php/schema.sql`)
6. **Configure `.env`** (or your config constants)
7. **Install Composer dependencies**
   ```bash
   composer install
   ```
8. **Run project** in browser  
   Example: `http://localhost/PayNest-Pro/atiq-payroll-php/`

---

## 🗄️ Database Setup

1. Open phpMyAdmin  
2. Create a new database  
3. Import:
   - `/home/runner/work/PayNest-Pro/PayNest-Pro/atiq-payroll-php/schema.sql`
4. Verify tables like:
   - `admins`
   - `admin_logs`
   - `staff`

---

## 🔐 .env Configuration

Create a `.env` file (or map values in your PHP config):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payroll_db_2
```

---

## 📊 Excel Import Format

| ID | Name | Role | Department | Section | Month | Basic | HRA | DA | Allowance | PF | Tax | WorkingDays | CL_used | Medical_used | Personal_leave |
|----|------|------|------------|---------|-------|-------|-----|----|-----------|----|-----|-------------|---------|--------------|----------------|

---

## 🧮 Payroll Calculation Logic

**Gross Salary**  
`Basic + HRA + DA + Allowance`

**Deduction**  
`Per Day Salary × Unpaid Leaves`

**Final Salary**  
`Gross - Deduction - PF - Tax`

---

## 🧾 Salary Slip System

PayNest Pro generates salary slips for each payroll cycle with:
- employee details
- gross salary breakup
- leave-based deductions
- PF and tax deductions
- final payable salary

Salary slips are designed to be shareable and printable in PDF format.

---

## 📈 Dashboard Analytics

The dashboard gives quick operational insights, including:
- total staff count
- monthly salary summary
- payroll processing status
- department-level visibility
- recent payroll activities

---

## 🛡️ Security Features

- Admin authentication
- Session protection
- SQL injection prevention
- Prepared statements

---

## 🔮 Future Features

- Role-based multi-user access
- Department-wise payroll approval flow
- Email-based payslip dispatch
- Advanced attendance integration
- Automated tax rule updates
- REST API for ERP integration

---

## 🤝 Contribution

Contributions are welcome.

1. Fork the repository  
2. Create a feature branch  
3. Commit your changes  
4. Push your branch  
5. Open a Pull Request  

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Developer Credits

Developed by **Divyanshu**  
Project: **PayNest Pro – College Payroll Management System**
