<?php
require_once '../includes/auth.php';
requireAdmin();
$basePath = '../';
$pageTitle = 'All Registrations';
$regs = $conn->query("SELECT r.*, u.name uname, u.email uemail, e.title etitle, e.event_date
                      FROM registrations r
                      JOIN users u ON r.user_id=u.id
                      JOIN events e ON r.event_id=e.id
                      ORDER BY r.registered_at DESC");
include '../includes/header.php';
?>
<h1 class="page-title">All Registrations</h1>
<div class="table-wrap">
    <table>
        <thead><tr><th>User</th><th>Email</th><th>Event</th><th>Event Date</th><th>Registered</th><th>Status</th></tr></thead>
        <tbody>
        <?php if ($regs->num_rows === 0): ?>
            <tr><td colspan="6" class="text-center">No registrations yet.</td></tr>
        <?php else: ?>
            <?php while ($r = $regs->fetch_assoc()): ?>
                <tr>
                    <td><?= e($r['uname']) ?></td>
                    <td><?= e($r['uemail']) ?></td>
                    <td><?= e($r['etitle']) ?></td>
                    <td><?= date('M d, Y H:i', strtotime($r['event_date'])) ?></td>
                    <td><?= date('M d, Y H:i', strtotime($r['registered_at'])) ?></td>
                    <td><span class="badge badge-<?= $r['status']==='confirmed'?'success':'danger' ?>"><?= $r['status'] ?></span></td>
                </tr>
            <?php endwhile; ?>
        <?php endif; ?>
        </tbody>
    </table>
</div>
<?php include '../includes/footer.php'; ?>