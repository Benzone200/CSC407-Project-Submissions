<?php
require_once 'includes/auth.php';
requireLogin();
$basePath = '';
$pageTitle = 'My Registrations';
$uid = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && verifyCsrf($_POST['csrf'] ?? '')) {
    $regId = (int)$_POST['reg_id'];
    $stmt = $conn->prepare("UPDATE registrations SET status='cancelled' WHERE id=? AND user_id=?");
    $stmt->bind_param("ii", $regId, $uid);
    $stmt->execute();
    $_SESSION['flash'] = 'Registration cancelled.'; $_SESSION['flash_type'] = 'info';
    header('Location: my-registrations.php'); exit;
}

$regs = $conn->query("SELECT r.*, e.title, e.event_date, e.location, e.price 
                      FROM registrations r JOIN events e ON r.event_id=e.id 
                      WHERE r.user_id=$uid ORDER BY e.event_date DESC");
include 'includes/header.php';
?>
<h1 class="page-title">My Registrations</h1>
<?php if (!empty($_SESSION['flash'])): ?>
    <div class="alert alert-<?= $_SESSION['flash_type'] ?? 'info' ?>"><?= e($_SESSION['flash']) ?></div>
    <?php unset($_SESSION['flash'], $_SESSION['flash_type']); ?>
<?php endif; ?>

<?php if ($regs->num_rows === 0): ?>
    <div class="empty-state">You haven't registered for any events yet. <a href="events.php">Browse events →</a></div>
<?php else: ?>
    <div class="table-wrap">
        <table>
            <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
            <?php while ($r = $regs->fetch_assoc()): ?>
                <tr>
                    <td><a href="event-detail.php?id=<?= $r['event_id'] ?>"><?= e($r['title']) ?></a></td>
                    <td><?= date('M d, Y H:i', strtotime($r['event_date'])) ?></td>
                    <td><?= e($r['location']) ?></td>
                    <td>
                        <span class="badge badge-<?= $r['status'] === 'confirmed' ? 'success' : 'danger' ?>">
                            <?= ucfirst($r['status']) ?>
                        </span>
                    </td>
                    <td>
                        <?php if ($r['status'] === 'confirmed'): ?>
                            <form method="POST" style="display:inline;">
                                <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
                                <input type="hidden" name="reg_id" value="<?= $r['id'] ?>">
                                <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Cancel this registration?')">Cancel</button>
                            </form>
                        <?php else: ?>
                            <a href="event-detail.php?id=<?= $r['event_id'] ?>" class="btn btn-primary btn-sm">Re-register</a>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
<?php endif; ?>
<?php include 'includes/footer.php'; ?>