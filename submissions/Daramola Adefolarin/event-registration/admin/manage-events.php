<?php
require_once '../includes/auth.php';
requireAdmin();
$basePath = '../';
$pageTitle = 'Manage Events';

$errors = [];
// Handle create/update/delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && verifyCsrf($_POST['csrf'] ?? '')) {
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $title = trim($_POST['title'] ?? '');
        $desc = trim($_POST['description'] ?? '');
        $loc = trim($_POST['location'] ?? '');
        $date = $_POST['event_date'] ?? '';
        $cap = (int)($_POST['capacity'] ?? 100);
        $price = (float)($_POST['price'] ?? 0);
        if ($title && $loc && $date) {
            $stmt = $conn->prepare("INSERT INTO events (title, description, location, event_date, capacity, price, created_by) VALUES (?,?,?,?,?,?,?)");
            $stmt->bind_param("ssssidi", $title, $desc, $loc, $date, $cap, $price, $_SESSION['user_id']);
            $stmt->execute();
            $_SESSION['flash'] = 'Event created.';
            header('Location: manage-events.php'); exit;
        }
    } elseif ($action === 'delete') {
        $eid = (int)$_POST['id'];
        $conn->query("DELETE FROM events WHERE id=$eid");
        $_SESSION['flash'] = 'Event deleted.';
        header('Location: manage-events.php'); exit;
    }
}

$events = $conn->query("SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed') regs FROM events e ORDER BY event_date DESC");
include '../includes/header.php';
?>
<h1 class="page-title">Manage Events</h1>
<?php if (!empty($_SESSION['flash'])): ?>
    <div class="alert alert-success"><?= e($_SESSION['flash']) ?></div>
    <?php unset($_SESSION['flash']); ?>
<?php endif; ?>

<div class="form-container" style="max-width:100%;">
    <h2>Add New Event</h2>
    <form method="POST">
        <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
        <input type="hidden" name="action" value="create">
        <div class="form-group"><label>Title</label><input type="text" name="title" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
        <div class="form-group"><label>Location</label><input type="text" name="location" required></div>
        <div class="form-group"><label>Date & Time</label><input type="datetime-local" name="event_date" required></div>
        <div class="form-group"><label>Capacity</label><input type="number" name="capacity" value="100" min="1" required></div>
        <div class="form-group"><label>Price ($)</label><input type="number" name="price" value="0" min="0" step="0.01" required></div>
        <button type="submit" class="btn btn-primary">Create Event</button>
    </form>
</div>

<div class="table-wrap">
    <table>
        <thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Registrations</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>
        <?php while ($ev = $events->fetch_assoc()): ?>
            <tr>
                <td><?= e($ev['title']) ?></td>
                <td><?= date('M d, Y H:i', strtotime($ev['event_date'])) ?></td>
                <td><?= e($ev['location']) ?></td>
                <td><?= $ev['regs'] ?> / <?= $ev['capacity'] ?></td>
                <td><?= $ev['price'] > 0 ? '$' . number_format($ev['price'], 2) : 'Free' ?></td>
                <td>
                    <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= $ev['id'] ?>">
                        <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Delete event?')">Delete</button>
                    </form>
                </td>
            </tr>
        <?php endwhile; ?>
        </tbody>
    </table>
</div>
<?php include '../includes/footer.php'; ?>