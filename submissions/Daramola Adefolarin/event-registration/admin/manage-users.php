<?php
require_once '../includes/auth.php';
requireAdmin();
$basePath = '../';
$pageTitle = 'Manage Users';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && verifyCsrf($_POST['csrf'] ?? '')) {
    $uid = (int)$_POST['id'];
    $role = $_POST['role'] === 'admin' ? 'admin' : 'user';
    $stmt = $conn->prepare("UPDATE users SET role=? WHERE id=?");
    $stmt->bind_param("si", $role, $uid);
    $stmt->execute();
    $_SESSION['flash'] = 'Role updated.';
    header('Location: manage-users.php'); exit;
}

$users = $conn->query("SELECT u.*, (SELECT COUNT(*) FROM registrations r WHERE r.user_id=u.id AND r.status='confirmed') regs FROM users u ORDER BY created_at DESC");
include '../includes/header.php';
?>
<h1 class="page-title">Manage Users</h1>
<?php if (!empty($_SESSION['flash'])): ?>
    <div class="alert alert-success"><?= e($_SESSION['flash']) ?></div>
    <?php unset($_SESSION['flash']); ?>
<?php endif; ?>
<div class="table-wrap">
    <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Registrations</th><th>Joined</th><th>Change Role</th></tr></thead>
        <tbody>
        <?php while ($u = $users->fetch_assoc()): ?>
            <tr>
                <td><?= e($u['name']) ?></td>
                <td><?= e($u['email']) ?></td>
                <td><span class="badge badge-<?= $u['role'] === 'admin' ? 'warning' : 'success' ?>"><?= $u['role'] ?></span></td>
                <td><?= $u['regs'] ?></td>
                <td><?= date('M d, Y', strtotime($u['created_at'])) ?></td>
                <td>
                    <?php if ($u['id'] != $_SESSION['user_id']): ?>
                    <form method="POST" style="display:flex; gap:0.5rem;">
                        <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
                        <input type="hidden" name="id" value="<?= $u['id'] ?>">
                        <select name="role">
                            <option value="user" <?= $u['role']==='user'?'selected':'' ?>>User</option>
                            <option value="admin" <?= $u['role']==='admin'?'selected':'' ?>>Admin</option>
                        </select>
                        <button type="submit" class="btn btn-primary btn-sm">Save</button>
                    </form>
                    <?php else: ?>—<?php endif; ?>
                </td>
            </tr>
        <?php endwhile; ?>
        </tbody>
    </table>
</div>
<?php include '../includes/footer.php'; ?>