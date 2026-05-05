<?php require_once __DIR__ . '/includes/auth_guard.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Management | Atiq Payroll</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-layout">
        <aside class="sidebar">
            <div class="sidebar-header">
                Atiq Payroll
            </div>
            <ul class="sidebar-menu">
                <li><a href="dashboard.php">
                    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    Dashboard
                </a></li>
                <li><a href="upload_excel.php">
                    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    Upload Excel
                </a></li>
                <li class="active"><a href="staff_management.php">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Staff Management
                </a></li>
                <li><a href="#">
                    <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    Payroll
                </a></li>
                <li><a href="#">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    Reports
                </a></li>
                <li><a href="#">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    Settings
                </a></li>
            </ul>
        </aside>

        <div class="main-wrapper">
            <header class="desk-topbar">
                <h1 class="topbar-title-left">Staff Management</h1>
                <div class="topbar-actions">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg>
                        <input type="text" placeholder="Search staff...">
                    </div>
                    <button class="icon-button notification" aria-label="Notifications">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
                    </button>
                </div>
            </header>

            <main class="content-area">
                <div class="panel staff-panel">
                    <div class="staff-header-actions">
                        <div class="filters">
                            <select class="custom-select">
                                <option>All Departments</option>
                                <option>Engineering</option>
                                <option>Design</option>
                                <option>Marketing</option>
                                <option>Sales</option>
                            </select>
                            <select class="custom-select">
                                <option>All Statuses</option>
                                <option>Active</option>
                                <option>On Leave</option>
                            </select>
                        </div>
                        <button class="btn-primary">
                            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Add Employee
                        </button>
                    </div>

                    <div class="table-responsive">
                        <table class="staff-table">
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>DEPARTMENT</th>
                                    <th>BASIC SALARY</th>
                                    <th>NET SALARY</th>
                                    <th>STATUS</th>
                                    <th class="text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="--bg: #4f3ee8; --color: #fff;">EH</div>
                                            <div class="user-info">
                                                <strong>Eleanor Hughes</strong>
                                                <span>ehughes@atiq.com</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>Engineering</td>
                                    <td>$8,500.00</td>
                                    <td class="primary-text">$6,842.50</td>
                                    <td><span class="badge active">Active</span></td>
                                    <td class="text-right">
                                        <button class="action-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="--bg: #a44813; --color: #fff;">MR</div>
                                            <div class="user-info">
                                                <strong>Marcus Reed</strong>
                                                <span>mreed@atiq.com</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>Design</td>
                                    <td>$7,200.00</td>
                                    <td class="primary-text">$5,830.00</td>
                                    <td><span class="badge active">Active</span></td>
                                    <td class="text-right">
                                        <button class="action-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="--bg: #4c5262; --color: #fff;">SC</div>
                                            <div class="user-info">
                                                <strong>Sarah Chen</strong>
                                                <span>schen@atiq.com</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>Marketing</td>
                                    <td>$6,800.00</td>
                                    <td class="primary-text">$5,410.25</td>
                                    <td><span class="badge leave">On Leave</span></td>
                                    <td class="text-right">
                                        <button class="action-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="--bg: #3b2bd6; --color: #fff;">JP</div>
                                            <div class="user-info">
                                                <strong>James Patterson</strong>
                                                <span>jpatterson@atiq.com</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>Sales</td>
                                    <td>$5,500.00</td>
                                    <td class="primary-text">$4,280.00</td>
                                    <td><span class="badge active">Active</span></td>
                                    <td class="text-right">
                                        <button class="action-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar" style="--bg: #d46b20; --color: #fff;">LW</div>
                                            <div class="user-info">
                                                <strong>Lisa Wong</strong>
                                                <span>lwong@atiq.com</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>Engineering</td>
                                    <td>$9,200.00</td>
                                    <td class="primary-text">$7,450.00</td>
                                    <td><span class="badge active">Active</span></td>
                                    <td class="text-right">
                                        <button class="action-btn"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="pagination-footer">
                        <div class="pagination-info">Showing 1 to 5 of 42 entries</div>
                        <div class="pagination-controls">
                            <button class="page-btn"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                            <button class="page-btn active">1</button>
                            <button class="page-btn">2</button>
                            <button class="page-btn">3</button>
                            <span class="page-dots">...</span>
                            <button class="page-btn">9</button>
                            <button class="page-btn"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
</body>
</html>
