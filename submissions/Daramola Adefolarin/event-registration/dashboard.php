<?php
require_once 'includes/auth.php';
requireLogin();
$basePath = '';
$pageTitle = 'Dashboard';

$uid = $_SESSION['user_id'];
$total = $conn->query("SELECT COUNT(*) c FROM registrations WHERE user_id=$uid AND status='confirmed'")->fetch_assoc()['c'];
$upcoming = $conn->query("SELECT COUNT(*) c FROM registrations r JOIN events e ON r.event_id=e.id WHERE r.user_id=$uid AND r.status='confirmed' AND e.event_date >= NOW()")->fetch_assoc()['c'];
$eventsCount = $conn->query("SELECT COUNT(*) c FROM events")->fetch_assoc()['c'];

include 'includes/header.php';
?>
<h1 class="page-title">Welcome, <?= e($_SESSION['name']) ?> 👋</h1>
<div class="stats-grid">
    <div class="stat-card"><h3><?= $total ?></h3><p>Total Registrations</p></div>
    <div class="stat-card"><h3><?= $upcoming ?></h3><p>Upcoming Events</p></div>
    <div class="stat-card"><h3><?= $eventsCount ?></h3><p>Available Events</p></div>
</div>
<div style="display:flex; gap:1rem; flex-wrap:wrap;">
    <a href="events.php" class="btn btn-primary">Browse Events</a>
    <a href="my-registrations.php" class="btn btn-success">My Registrations</a>
</div>
<?php include 'includes/footer.php'; ?>