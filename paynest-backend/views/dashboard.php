<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PayNest Pro — Dashboard</title>
  <meta name="description" content="PayNest Pro Payroll Management Dashboard — Overview of staff, salary, departments and payroll status."/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/assets/css/dashboard.css"/>
</head>

<body>

<!-- ════════════ Sidebar Overlay (mobile) ════════════ -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<!-- ════════════ Sidebar ══════════════════════════════ -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar__brand">
    <h1>Atiq Payroll</h1>
  </div>

  <nav class="sidebar__nav">
    <a class="nav-item nav-item--active" href="/dashboard">
      <span class="material-symbols-outlined">dashboard</span>
      Dashboard
    </a>
    <a class="nav-item" href="/upload">
      <span class="material-symbols-outlined">upload_file</span>
      Upload Excel
    </a>
    <a class="nav-item" href="/staff">
      <span class="material-symbols-outlined">groups</span>
      Staff Management
    </a>
    <a class="nav-item" href="/payroll">
      <span class="material-symbols-outlined">payments</span>
      Payroll
    </a>
    <a class="nav-item" href="/reports">
      <span class="material-symbols-outlined">assessment</span>
      Reports
    </a>
    <a class="nav-item" href="/settings">
      <span class="material-symbols-outlined">settings</span>
      Settings
    </a>
  </nav>
</aside>

<!-- ════════════ Main Content ════════════════════════ -->
<div class="main-wrapper">

  <!-- ── Top Header ──────────────────────────────── -->
  <header class="header">
    <div class="header__left">
      <button class="header__menu-btn" id="menuBtn" aria-label="Open menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <h2 class="header__title">Dashboard</h2>
    </div>

    <div class="header__actions">
      <button class="header__icon-btn" aria-label="Search">
        <span class="material-symbols-outlined">search</span>
      </button>
      <button class="header__icon-btn" aria-label="Notifications">
        <span class="material-symbols-outlined">notifications</span>
        <span class="header__badge"></span>
      </button>
      <div class="header__avatar">A</div>
    </div>
  </header>

  <!-- ── Page Content ────────────────────────────── -->
  <main class="page">
    <div class="page__inner">

      <!-- Section Header -->
      <div class="section-header">
        <div>
          <h3 class="section-header__title">Overview</h3>
          <p class="section-header__subtitle">Here is your payroll summary for October 2023.</p>
        </div>
        <div class="section-header__actions">
          <button class="btn btn--outline">
            <span class="material-symbols-outlined">calendar_month</span>
            Oct 2023
            <span class="material-symbols-outlined">expand_more</span>
          </button>
          <button class="btn btn--primary">
            <span class="material-symbols-outlined">download</span>
            Export
          </button>
        </div>
      </div>

      <!-- ── Metrics Grid ──────────────────────────── -->
      <div class="metrics-grid">
        <!-- Card 1: Total Staff -->
        <div class="metric-card animate-in">
          <div class="metric-card__header">
            <span class="metric-card__label">Total Staff</span>
            <div class="metric-card__icon metric-card__icon--primary">
              <span class="material-symbols-outlined">group</span>
            </div>
          </div>
          <div class="metric-card__value">
            <span class="metric-card__number">1,248</span>
            <span class="metric-card__trend">
              <span class="material-symbols-outlined">trending_up</span>
              +12
            </span>
          </div>
        </div>

        <!-- Card 2: Monthly Salary -->
        <div class="metric-card animate-in">
          <div class="metric-card__header">
            <span class="metric-card__label">Monthly Salary</span>
            <div class="metric-card__icon metric-card__icon--primary">
              <span class="material-symbols-outlined">account_balance_wallet</span>
            </div>
          </div>
          <div class="metric-card__value">
            <span class="metric-card__number">$4.2M</span>
            <span class="metric-card__trend">
              <span class="material-symbols-outlined">trending_up</span>
              2.4%
            </span>
          </div>
        </div>

        <!-- Card 3: Departments -->
        <div class="metric-card animate-in">
          <div class="metric-card__header">
            <span class="metric-card__label">Departments</span>
            <div class="metric-card__icon metric-card__icon--secondary">
              <span class="material-symbols-outlined">domain</span>
            </div>
          </div>
          <div class="metric-card__value">
            <span class="metric-card__number">14</span>
          </div>
        </div>

        <!-- Card 4: Payroll Status -->
        <div class="metric-card animate-in">
          <div class="metric-card__header">
            <span class="metric-card__label">Payroll Status</span>
            <div class="metric-card__icon metric-card__icon--muted">
              <span class="material-symbols-outlined">pending_actions</span>
            </div>
          </div>
          <div class="metric-card__value">
            <span class="metric-card__number metric-card__number--secondary">Draft</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: 45%"></div>
          </div>
          <p class="metric-card__sub">45% processed</p>
        </div>
      </div>

      <!-- ── Charts & Activity ──────────────────────── -->
      <div class="charts-grid">

        <!-- Salary Trend Chart -->
        <div class="card">
          <div class="card__header">
            <h3 class="card__title">Salary Trend</h3>
            <button class="card__action">
              Year to Date
              <span class="material-symbols-outlined">expand_more</span>
            </button>
          </div>

          <div class="chart-area">
            <div class="chart-y-axis">
              <span>5M</span><span>4M</span><span>3M</span><span>2M</span><span>1M</span><span>0</span>
            </div>
            <div class="chart-bar chart-bar--filled" style="height:60%">
              <span class="chart-tooltip">$3.1M</span>
            </div>
            <div class="chart-bar chart-bar--filled" style="height:65%">
              <span class="chart-tooltip">$3.3M</span>
            </div>
            <div class="chart-bar chart-bar--filled" style="height:70%">
              <span class="chart-tooltip">$3.6M</span>
            </div>
            <div class="chart-bar chart-bar--filled" style="height:75%">
              <span class="chart-tooltip">$3.8M</span>
            </div>
            <div class="chart-bar chart-bar--active" style="height:82%">
              <span class="chart-tooltip">$4.2M</span>
            </div>
            <div class="chart-bar chart-bar--empty"></div>
          </div>

          <div class="chart-x-axis">
            <span class="chart-x-label">Jun</span>
            <span class="chart-x-label">Jul</span>
            <span class="chart-x-label">Aug</span>
            <span class="chart-x-label">Sep</span>
            <span class="chart-x-label chart-x-label--active">Oct</span>
            <span class="chart-x-label">Nov</span>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card activity-card">
          <div class="card__header">
            <h3 class="card__title">Recent Activity</h3>
          </div>

          <div class="activity-list">
            <div class="activity-item">
              <div class="activity-icon activity-icon--default">
                <span class="material-symbols-outlined">upload_file</span>
              </div>
              <div>
                <p class="activity-title">October Timesheets Uploaded</p>
                <p class="activity-sub">by Sarah J. &bull; 2 hours ago</p>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon activity-icon--error">
                <span class="material-symbols-outlined">error</span>
              </div>
              <div>
                <p class="activity-title">3 Missing Tax Forms</p>
                <p class="activity-sub">Action required before processing.</p>
              </div>
            </div>

            <div class="activity-item">
              <div class="activity-icon activity-icon--default">
                <span class="material-symbols-outlined">person_add</span>
              </div>
              <div>
                <p class="activity-title">5 New Employees Added</p>
                <p class="activity-sub">Engineering Dept &bull; 1 day ago</p>
              </div>
            </div>
          </div>

          <button class="btn btn--ghost">View All Activity</button>
        </div>
      </div>

    </div><!-- /.page__inner -->
  </main>
</div><!-- /.main-wrapper -->

<!-- ════════════ JavaScript ════════════════════════ -->
<script>
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  menuBtn.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Animate progress bar on load
  window.addEventListener('load', () => {
    document.querySelectorAll('.progress-fill').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.width = w; });
    });
  });
</script>

</body>
</html>
