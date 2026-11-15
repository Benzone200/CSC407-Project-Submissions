<?php
require_once '../includes/auth.php';
requireAdmin();
$basePath = '../';
$pageTitle = 'Admin Dashboard';

$stats = [
    'users' => $conn->query("SELECT COUNT(*) c FROM users")->fetch_assoc()['c'],
    'events' => $conn->query("SELECT COUNT(*) c FROM events")->fetch_assoc()['c'],
    'registrations' => $conn->query("SELECT COUNT(*) c FROM registrations WHERE status='confirmed'")->fetch_assoc()['c'],
    'revenue' => $conn->query("SELECT COALESCE(SUM(e.price),0) s FROM registrations r JOIN events e ON r.event_id=e.id WHERE r.status='confirmed'")->fetch_assoc()['s'],
];
include '../includes/header.php';
?>
<h1 class="page-title">Admin Dashboard</h1>
<div class="stats-grid">
    <div class="stat-card"><h3><?= $stats['users'] ?></h3><p>Total Users</p></div>
    <div class="stat-card"><h3><?= $stats['events'] ?></h3><p>Total Events</p></div>
    <div class="stat-card"><h3><?= $stats['registrations'] ?></h3><p>Confirmed Registrations</p></div>
    <div class="stat-card"><h3>$<?= number_format($stats['revenue'], 2) ?></h3><p>Revenue</p></div>
</div>
<div style="display:flex; gap:1rem; flex-wrap:wrap;">
    <a href="manage-events.php" class="btn btn-primary">Manage Events</a>
    <a href="manage-users.php" class="btn btn-success">Manage Users</a>
    <a href="manage-registrations.php" class="btn btn-danger">View Registrations</a>
</div>
<?php include '../includes/footer.php'; ?>