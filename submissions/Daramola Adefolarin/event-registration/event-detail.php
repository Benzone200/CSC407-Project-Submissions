<?php
require_once 'includes/auth.php';
$basePath = '';
$pageTitle = 'Event Details';
$id = (int)($_GET['id'] ?? 0);

$stmt = $conn->prepare("SELECT * FROM events WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$event = $stmt->get_result()->fetch_assoc();
if (!$event) { die('Event not found.'); }

// Handle register/cancel
$msg = ''; $msgType = 'info';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isLoggedIn()) {
    if (!verifyCsrf($_POST['csrf'] ?? '')) {
        $msg = 'Invalid request.'; $msgType = 'danger';
    } else {
        $action = $_POST['action'] ?? '';
        if ($action === 'register') {
            // Check capacity
            $stmt = $conn->prepare("SELECT COUNT(*) c FROM registrations WHERE event_id = ? AND status = 'confirmed'");
            $stmt->bind_param("i", $id); $stmt->execute();
            $count = $stmt->get_result()->fetch_assoc()['c'];
            if ($count >= $event['capacity']) {
                $msg = 'Event is full.'; $msgType = 'danger';
            } else {
                $stmt = $conn->prepare("INSERT INTO registrations (user_id, event_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status='confirmed'");
                $stmt->bind_param("ii", $_SESSION['user_id'], $id);
                $stmt->execute();
                $msg = 'Registration confirmed!'; $msgType = 'success';
            }
        } elseif ($action === 'cancel') {
            $stmt = $conn->prepare("UPDATE registrations SET status='cancelled' WHERE user_id=? AND event_id=?");
            $stmt->bind_param("ii", $_SESSION['user_id'], $id);
            $stmt->execute();
            $msg = 'Registration cancelled.'; $msgType = 'info';
        }
    }
}

// Fetch counts
$stmt = $conn->prepare("SELECT COUNT(*) c FROM registrations WHERE event_id = ? AND status='confirmed'");
$stmt->bind_param("i", $id); $stmt->execute();
$registered = $stmt->get_result()->fetch_assoc()['c'];

$userReg = null;
if (isLoggedIn()) {
    $stmt = $conn->prepare("SELECT status FROM registrations WHERE user_id=? AND event_id=?");
    $stmt->bind_param("ii", $_SESSION['user_id'], $id);
    $stmt->execute();
    $userReg = $stmt->get_result()->fetch_assoc();
}
include 'includes/header.php';
?>
<div style="background:white; padding:2.5rem; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h1><?= e($event['title']) ?></h1>
    <div style="margin:1.5rem 0;">
        <p class="event-meta">📅 <?= date('l, F j, Y \a\t H:i', strtotime($event['event_date'])) ?></p>
        <p class="event-meta">📍 <?= e($event['location']) ?></p>
        <p class="event-meta">👥 <?= $registered ?> / <?= $event['capacity'] ?> registered</p>
        <p class="price" style="margin-top:0.5rem;"><?= $event['price'] > 0 ? '$' . number_format($event['price'], 2) : 'Free' ?></p>
    </div>
    <p style="margin-bottom:2rem; white-space:pre-line;"><?= e($event['description']) ?></p>

    <?php if ($msg): ?><div class="alert alert-<?= $msgType ?>"><?= e($msg) ?></div><?php endif; ?>

    <?php if (!isLoggedIn()): ?>
        <a href="login.php" class="btn btn-primary">Login to Register</a>
    <?php elseif ($userReg && $userReg['status'] === 'confirmed'): ?>
        <span class="badge badge-success" style="margin-right:1rem;">✓ You're registered</span>
        <form method="POST" style="display:inline;">
            <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
            <input type="hidden" name="action" value="cancel">
            <button type="submit" class="btn btn-danger" onclick="return confirm('Cancel registration?')">Cancel Registration</button>
        </form>
    <?php elseif ($registered >= $event['capacity']): ?>
        <span class="badge badge-danger">Event Full</span>
    <?php else: ?>
        <form method="POST">
            <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
            <input type="hidden" name="action" value="register">
            <button type="submit" class="btn btn-primary">Register Now</button>
        </form>
    <?php endif; ?>
    <a href="events.php" class="btn" style="background:var(--light); color:var(--dark);">← Back to Events</a>
</div>
<?php include 'includes/footer.php'; ?>