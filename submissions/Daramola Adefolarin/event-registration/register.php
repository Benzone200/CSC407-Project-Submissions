<?php
require_once 'includes/auth.php';
$basePath = '';
$pageTitle = 'Sign Up';

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCsrf($_POST['csrf'] ?? '')) {
        $errors[] = 'Invalid request.';
    }
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    if ($name === '') $errors[] = 'Name is required.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email required.';
    if (strlen($password) < 6) $errors[] = 'Password must be at least 6 characters.';
    if ($password !== $confirm) $errors[] = 'Passwords do not match.';

    if (!$errors) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->fetch_assoc()) {
            $errors[] = 'Email already registered.';
        }
        $stmt->close();
    }

    if (!$errors) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $name, $email, $hash);
        if ($stmt->execute()) {
            $_SESSION['flash'] = 'Registration successful! Please log in.';
            $_SESSION['flash_type'] = 'success';
            header('Location: login.php');
            exit;
        } else {
            $errors[] = 'Registration failed. Try again.';
        }
    }
}
include 'includes/header.php';
?>
<div class="form-container">
    <h2>Create Account</h2>
    <?php foreach ($errors as $e): ?>
        <div class="alert alert-danger"><?= e($e) ?></div>
    <?php endforeach; ?>
    <form method="POST">
        <input type="hidden" name="csrf" value="<?= csrfToken() ?>">
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value="<?= e($_POST['name'] ?? '') ?>" required>
        </div>
        <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" value="<?= e($_POST['email'] ?? '') ?>" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required>
        </div>
        <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" name="confirm" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign Up</button>
    </form>
    <p class="text-center mt-2">Already have an account? <a href="login.php">Login</a></p>
</div>
<?php include 'includes/footer.php'; ?>