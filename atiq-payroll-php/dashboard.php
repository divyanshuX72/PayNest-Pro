<?php require_once __DIR__ . '/includes/auth_guard.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | Atiq Payroll</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-shell">
        <header class="topbar">
            <button class="icon-button" aria-label="Open menu">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            <h1>Dashboard</h1>
            <div class="topbar-actions">
                <button class="icon-button" aria-label="Search">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg>
                </button>
                <button class="icon-button notification" aria-label="Notifications">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
                </button>
                <button class="avatar" aria-label="Account">A</button>
            </div>
        </header>

        <main class="content">
            <section class="overview">
                <h2>Overview</h2>
                <p>Here is your payroll summary for October 2023.</p>

                <div class="toolbar">
                    <button class="date-select">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
                        <span>Oct 2023</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <button class="export-button">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>
                        Export
                    </button>
                </div>
            </section>

            <section class="stats-grid" aria-label="Payroll summary">
                <article class="metric-card">
                    <div>
                        <span class="metric-label">Total Staff</span>
                        <div class="metric-value-row">
                            <strong>1,248</strong>
                            <span class="metric-change">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 17 6-6 4 4 6-8M14 7h6v6"/></svg>
                                +12
                            </span>
                        </div>
                    </div>
                    <div class="metric-icon accent">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                </article>

                <article class="metric-card">
                    <div>
                        <span class="metric-label">Monthly Salary</span>
                        <div class="metric-value-row">
                            <strong>$4.2M</strong>
                            <span class="metric-change">~2.4%</span>
                        </div>
                    </div>
                    <div class="metric-icon accent">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z"/><path d="M11 11h6v6h-6z"/><path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/></svg>
                    </div>
                </article>

                <article class="metric-card">
                    <div>
                        <span class="metric-label">Departments</span>
                        <div class="metric-value-row">
                            <strong>14</strong>
                        </div>
                    </div>
                    <div class="metric-icon muted">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M6 21V3h12v18M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/></svg>
                    </div>
                </article>

                <article class="metric-card status-card">
                    <div>
                        <span class="metric-label">Payroll Status</span>
                        <strong class="status-title">Draft</strong>
                        <div class="progress-track"><span></span></div>
                        <p>45% processed</p>
                    </div>
                    <div class="metric-icon muted">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11h6M9 15h3M9 3v3M15 3v3M5 6h14v15H5z"/><path d="M16 13h4v6h-4zM18 11v2"/></svg>
                    </div>
                </article>
            </section>

            <section class="panel trend-panel">
                <div class="panel-header">
                    <h3>Salary Trend</h3>
                    <button class="period-select">Year to Date <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
                </div>
                <div class="chart" aria-label="Salary trend bar chart">
                    <div class="y-axis">
                        <span>5M</span>
                        <span>4M</span>
                        <span>3M</span>
                        <span>2M</span>
                        <span>1M</span>
                        <span>0</span>
                    </div>
                    <div class="plot">
                        <div class="bar" style="--height: 60%"><span>Jun</span></div>
                        <div class="bar" style="--height: 65%"><span>Jul</span></div>
                        <div class="bar" style="--height: 70%"><span>Aug</span></div>
                        <div class="bar" style="--height: 75%"><span>Sep</span></div>
                        <div class="bar current" style="--height: 82%"><span>Oct</span></div>
                        <div class="bar forecast" style="--height: 10%"><span>Nov</span></div>
                    </div>
                </div>
            </section>

            <section class="panel activity-panel">
                <h3>Recent Activity</h3>
                <ul class="activity-list">
                    <li>
                        <span class="activity-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h2"/></svg>
                        </span>
                        <div>
                            <strong>October Timesheets Uploaded</strong>
                            <p>by Sarah J. &bull; 2 hours ago</p>
                        </div>
                    </li>
                    <li>
                        <span class="activity-icon warning">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
                        </span>
                        <div>
                            <strong>3 Missing Tax Forms</strong>
                            <p>Action required before processing.</p>
                        </div>
                    </li>
                    <li>
                        <span class="activity-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"/></svg>
                        </span>
                        <div>
                            <strong>5 New Employees Added</strong>
                            <p>Engineering Dept &bull; 1 day ago</p>
                        </div>
                    </li>
                </ul>
                <button class="activity-button">View All Activity</button>
            </section>
        </main>
    </div>
</body>
</html>
