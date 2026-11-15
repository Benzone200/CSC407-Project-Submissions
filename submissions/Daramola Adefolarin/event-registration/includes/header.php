<?php require_once __DIR__ . '/auth.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($pageTitle) ? e($pageTitle) : 'Event Registration' ?></title>
    <link rel="stylesheet" href="<?= isset($basePath) ? $basePath : '' ?>assets/css/style.css">
</head>
<body>
<nav class="navbar">
    <div class="nav-container">
        <a href="<?= isset($basePath) ? $basePath : '' ?>index.php" class="logo">🎟️ EventHub</a>
        <ul class="nav-links">
            <li><a href="<?= isset($basePath) ? $basePath : '' ?>events.php">Events</a></li>
            <?php if (isLoggedIn()): ?>
                <li><a href="<?= isset($basePath) ? $basePath : '' ?>dashboard.php">Dashboard</a></li>
                <li><a href="<?= isset($basePath) ? $basePath : '' ?>my-registrations.php">My Registrations</a></li>
                <?php if (isAdmin()): ?>
                    <li><a href="<?= isset($basePath) ? $basePath : '' ?>admin/index.php">Admin</a></li>
                <?php endif; ?>
                <li><a href="<?= isset($basePath) ? $basePath : '' ?>logout.php" class="btn-logout">Logout (<?= e($_SESSION['name']) ?>)</a></li>
            <?php else: ?>
                <li><a href="<?= isset($basePath) ? $basePath : '' ?>login.php">Login</a></li>
                <li><a href="<?= isset($basePath) ? $basePath : '' ?>register.php" class="btn-signup">Sign Up</a></li>
            <?php endif; ?>
        </ul>
    </div>
</nav>
<main class="container">