<?php
require_once 'includes/auth.php';
$basePath = '';
$pageTitle = 'Home';
$events = $conn->query("SELECT * FROM events WHERE event_date >= NOW() ORDER BY event_date ASC LIMIT 3");
include 'includes/header.php';
?>
<div class="hero">
    <h1>Discover Amazing Events</h1>
    <p>Register for conferences, workshops, and networking events near you.</p>
    <a href="events.php" class="btn btn-primary mt-2">Browse All Events</a>
</div>
<h2 class="page-title">Upcoming Events</h2>
<?php if ($events->num_rows === 0): ?>
    <div class="empty-state">No upcoming events yet.</div>
<?php else: ?>
    <div class="events-grid">
        <?php while ($ev = $events->fetch_assoc()): ?>
            <div class="event-card">
                <div class="event-card-body">
                    <h3><?= e($ev['title']) ?></h3>
                    <p class="event-meta">📅 <?= date('M d, Y H:i', strtotime($ev['event_date'])) ?></p>
                    <p class="event-meta">📍 <?= e($ev['location']) ?></p>
                    <p class="event-description"><?= e(substr($ev['description'], 0, 100)) ?>...</p>
                    <div class="event-footer">
                        <span class="price"><?= $ev['price'] > 0 ? '$' . number_format($ev['price'], 2) : 'Free' ?></span>
                        <a href="event-detail.php?id=<?= $ev['id'] ?>" class="btn btn-primary btn-sm">View Details</a>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
    </div>
<?php endif; ?>
<?php include 'includes/footer.php'; ?>