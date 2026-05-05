<?php
/**
 * PayNest Pro - Audit Log Viewer (Admin Only)
 * Displays all admin actions with filtering.
 */
require_once __DIR__ . '/includes/auth_guard.php';

// Only super_admin can view logs
if ($currentAdmin['role'] !== 'super_admin') {
    http_response_code(403);
    die('<h2>403 – Insufficient permissions. Only super admins can view audit logs.</h2>');
}

// Filters
$filterAction   = sanitize($_GET['action']   ?? '');
$filterAdmin    = (int) ($_GET['admin_id']   ?? 0);
$filterDateFrom = sanitize($_GET['date_from'] ?? '');
$filterDateTo   = sanitize($_GET['date_to']   ?? '');

$where  = ['1=1'];
$params = [];

if ($filterAction) {
    $where[]  = 'l.action LIKE ?';
    $params[] = '%' . $filterAction . '%';
}
if ($filterAdmin) {
    $where[]  = 'l.admin_id = ?';
    $params[] = $filterAdmin;
}
if ($filterDateFrom) {
    $where[]  = 'DATE(l.created_at) >= ?';
    $params[] = $filterDateFrom;
}
if ($filterDateTo) {
    $where[]  = 'DATE(l.created_at) <= ?';
    $params[] = $filterDateTo;
}

$sql = 'SELECT l.*, a.email, a.name
        FROM admin_logs l
        JOIN admins a ON a.id = l.admin_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY l.created_at DESC
        LIMIT 500';

$logs   = DB::all($sql, $params);
$admins = DB::all('SELECT id, name, email FROM admins ORDER BY name');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Logs – <?= e(APP_NAME) ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>
<!-- Sidebar -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
<aside class="sidebar" id="sidebar">
    <div class="sidebar-brand"><div class="brand-icon">💰</div><h2><?= e(APP_NAME) ?></h2></div>
    <nav>
        <a href="dashboard.php"><span class="nav-icon">📊</span> Dashboard</a>
        <a href="staff_management.php"><span class="nav-icon">👥</span> Staff</a>
        <a href="payroll/calculate.php"><span class="nav-icon">💸</span> Payroll</a>
        <a href="upload_excel.php"><span class="nav-icon">🔄</span> Import</a>
        <a href="audit_logs.php" class="active"><span class="nav-icon">📋</span> Audit Logs</a>
    </nav>
    <button class="logout-btn" onclick="location.href='auth/logout.php'">🚪 Logout</button>
</aside>

<main class="main-content">
    <header class="topbar">
        <div style="display:flex;align-items:center;gap:1rem">
            <button class="hamburger" onclick="toggleSidebar()">☰</button>
            <div>
                <h1>📋 Audit Logs</h1>
                <p style="color:var(--text-muted);font-size:.75rem">All admin actions tracked in real-time</p>
            </div>
        </div>
        <div class="topbar-right">
            <span style="font-size:.8rem;color:var(--text-muted)">👤 <?= currentAdminName() ?></span>
        </div>
    </header>

    <div class="page-container">
        <!-- Filters -->
        <form method="GET" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem;align-items:flex-end">
            <div>
                <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em">Action</label>
                <input type="text" name="action" value="<?= e($filterAction) ?>" placeholder="e.g. login"
                    style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.55rem .85rem;color:#e2e8f0;font-size:.85rem;font-family:inherit;outline:none;width:160px">
            </div>
            <div>
                <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em">Admin</label>
                <select name="admin_id" style="background:#0d1229;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.55rem .85rem;color:#e2e8f0;font-size:.85rem;font-family:inherit;outline:none;min-width:160px">
                    <option value="">All Admins</option>
                    <?php foreach ($admins as $a): ?>
                        <option value="<?= $a['id'] ?>" <?= $filterAdmin == $a['id'] ? 'selected' : '' ?>>
                            <?= e($a['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em">From</label>
                <input type="date" name="date_from" value="<?= e($filterDateFrom) ?>"
                    style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.55rem .85rem;color:#e2e8f0;font-size:.85rem;font-family:inherit;outline:none">
            </div>
            <div>
                <label style="display:block;font-size:.75rem;color:#64748b;margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.05em">To</label>
                <input type="date" name="date_to" value="<?= e($filterDateTo) ?>"
                    style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.55rem .85rem;color:#e2e8f0;font-size:.85rem;font-family:inherit;outline:none">
            </div>
            <button type="submit" class="btn" style="padding:.55rem 1.25rem;font-size:.85rem">🔍 Filter</button>
            <a href="audit_logs.php" class="btn btn-secondary" style="padding:.55rem 1.25rem;font-size:.85rem">Reset</a>
        </form>

        <!-- Table -->
        <div class="card" style="padding:0;overflow:hidden">
            <div style="overflow-x:auto">
                <table style="display:table;width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Detail</th>
                            <th>IP Address</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($logs)): ?>
                            <tr><td colspan="6" style="text-align:center;padding:2.5rem;color:#64748b">No logs found.</td></tr>
                        <?php else: foreach ($logs as $log): ?>
                        <tr>
                            <td style="color:#64748b;font-size:.78rem"><?= $log['id'] ?></td>
                            <td>
                                <div style="font-weight:600;font-size:.85rem"><?= e($log['name']) ?></div>
                                <div style="font-size:.72rem;color:#64748b"><?= e($log['email']) ?></div>
                            </td>
                            <td>
                                <?php
                                $actionColors = [
                                    'login_success'  => '#10b981',
                                    'logout'         => '#64748b',
                                    'auto_logout'    => '#f59e0b',
                                    'account_locked' => '#ef4444',
                                    'login_blocked'  => '#ef4444',
                                    'otp_verified'   => '#10b981',
                                    'otp_failed'     => '#ef4444',
                                    'pay_salary'     => '#3b82f6',
                                    'bulk_pay'       => '#3b82f6',
                                    'delete_staff'   => '#ef4444',
                                    'password_changed' => '#f59e0b',
                                ];
                                $color = $actionColors[$log['action']] ?? '#94a3b8';
                                ?>
                                <span style="background:<?= $color ?>22;color:<?= $color ?>;border:1px solid <?= $color ?>44;
                                    padding:.2rem .6rem;border-radius:20px;font-size:.73rem;font-weight:600;white-space:nowrap">
                                    <?= e($log['action']) ?>
                                </span>
                            </td>
                            <td style="font-size:.8rem;color:#94a3b8;max-width:200px"><?= e($log['detail']) ?></td>
                            <td style="font-size:.8rem;font-family:monospace;color:#64748b"><?= e($log['ip_address']) ?></td>
                            <td style="font-size:.78rem;color:#94a3b8;white-space:nowrap">
                                <?= date('d M Y', strtotime($log['created_at'])) ?><br>
                                <span style="color:#64748b"><?= date('h:i:s A', strtotime($log['created_at'])) ?></span>
                            </td>
                        </tr>
                        <?php endforeach; endif; ?>
                    </tbody>
                </table>
            </div>
            <div style="padding:.65rem 1.25rem;border-top:1px solid rgba(255,255,255,.06);font-size:.77rem;color:#64748b">
                Showing <?= count($logs) ?> record(s) (max 500)
            </div>
        </div>
    </div>
</main>
<script>
    function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('active')}
    function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('active')}
</script>
</body>
</html>
