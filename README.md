# PayNest-Pro

# 💼 PayNest Pro

![PHP](https://img.shields.io/badge/PHP-8.x-blue)
![MySQL](https://img.shields.io/badge/MySQL-Database-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Active-success)

A modern **College Payroll Management System** developed using **PHP & MySQL** that automates staff payroll processing, attendance-based salary calculation, Excel import/export, dashboard analytics, and PDF salary slip generation.

---

# 🚀 Overview

**PayNest Pro** is a professional payroll automation platform designed for colleges and educational institutions. The system simplifies payroll operations by handling employee salary calculations, leave deductions, Excel-based payroll imports, and salary slip generation through a centralized admin dashboard.

The platform supports real-time payroll tracking, monthly payroll cycles, and secure staff management with a clean and modern UI.

---

# ✨ Features

✅ Staff Management
✅ Excel Import & Export
✅ Monthly Payroll Cycle
✅ Attendance-Based Salary Calculation
✅ CL & Medical Leave Quota System
✅ Payroll Payment Tracking
✅ PDF Salary Slip Generation
✅ Dashboard Analytics
✅ Secure Admin Authentication
✅ Real-Time Salary Calculation
✅ Search & Filter System
✅ Payroll Status Tracking
✅ Salary Deduction Management
✅ Responsive Admin Dashboard

---

# 📸 Screenshots

## Dashboard

<img width="1895" height="892" alt="image" src="https://github.com/user-attachments/assets/39916cca-eebc-4ba5-9160-1e45da8f64b6" />


## Staff Management

<img width="1875" height="916" alt="image" src="https://github.com/user-attachments/assets/2d5f54fe-fafa-4919-9fdc-8952a39707fd" />


## Salary Slip

<img width="596" height="846" alt="image" src="https://github.com/user-attachments/assets/78008af4-4973-47c6-8e7d-520f6b8e6ee4" />


## Import & Export

<img width="1901" height="906" alt="image" src="https://github.com/user-attachments/assets/5effbca3-3a20-487c-bbc8-e99f099b255b" />


---

# 🗂️ Folder Structure

```bash
PayNest-Pro/
│
├── assets/
├── config/
├── database/
├── includes/
├── uploads/
├── templates/
├── payroll/
├── staff/
├── auth/
├── vendor/
├── .env
├── index.php
└── README.md
```

---

# ⚙️ Installation Guide

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/paynest-pro.git
```

---

## 2️⃣ Move Project to htdocs

Move the project folder into:

```bash
xampp/htdocs/
```

---

## 3️⃣ Start Apache & MySQL

Open **XAMPP Control Panel** and start:

* Apache
* MySQL

---

## 4️⃣ Create Database

Open:

```bash
http://localhost/phpmyadmin
```

Create database:

```sql
payroll_db_2
```

---

## 5️⃣ Import SQL File

Import the provided SQL database file into:

```sql
payroll_db_2
```

---

## 6️⃣ Configure .env File

Create `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=payroll_db_2
```

---

## 7️⃣ Install Composer Dependencies

```bash
composer install
```

---

## 8️⃣ Run Project

Open browser:

```bash
http://localhost/paynest-pro
```

---

# 📊 Excel Import Format

| ID | Name | Role | Department | Section | Month | Basic | HRA | DA | Allowance | PF | Tax | WorkingDays | CL_used | Medical_used | Personal_leave |
| -- | ---- | ---- | ---------- | ------- | ----- | ----- | --- | -- | --------- | -- | --- | ----------- | ------- | ------------ | -------------- |

---

# 🧮 Payroll Calculation Logic

## Gross Salary

```text
Gross Salary = Basic + HRA + DA + Allowance
```

## Deduction

```text
Deduction = Per Day Salary × Unpaid Leaves
```

## Final Salary

```text
Final Salary = Gross - Deduction - PF - Tax
```

---

# 📄 Salary Slip System

The system automatically generates professional salary slips in PDF format with:

* Employee Details
* Salary Breakdown
* Leave Deduction
* Payroll Status
* Net Salary
* Payment Date & Time

Powered using:

* Dompdf

---

# 📈 Dashboard Analytics

Dashboard includes:

* Total Staff
* Total Salary Payout
* Attendance Rate
* Pending Payroll
* Monthly Salary Trend
* Payroll Status Analytics

All analytics are generated using live database data.

---

# 🔐 Security Features

✅ Secure Admin Login
✅ Session Protection
✅ Password Hashing
✅ SQL Injection Prevention
✅ Prepared Statements
✅ Protected Admin Routes
✅ Payroll Action Tracking

---

# 🔄 Monthly Payroll Workflow

1. Import Excel payroll data
2. Staff records verified
3. Payroll generated month-wise
4. Salary calculated automatically
5. Leave deductions applied
6. Admin processes payroll
7. Salary slip generated

---

# 🧠 Future Improvements

* Biometric Attendance Integration
* Multi-Admin Support
* Cloud Backup
* Email Salary Slips
* Payroll Reports Export
* SMS Notifications
* Mobile Responsive App
* Desktop EXE Version

---

# 🤝 Contribution

Contributions are welcome.

To contribute:

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push branch
5. Create Pull Request

---

# 📜 License

This project is licensed under the MIT License.

---

# 👨‍💻 Developer

Developed by **Divyanshu**

Project:
**PayNest Pro — College Payroll Management System**

---

# ⭐ Support

If you like this project:

⭐ Star the repository
🍴 Fork the project
📢 Share feedback

---

Made with ❤️ using PHP & MySQL
