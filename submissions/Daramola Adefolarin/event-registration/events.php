<?php
require_once 'includes/auth.php';
$basePath = '';
$pageTitle = 'Events';
$search = trim($_GET['search'] ?? '');
if ($search) {
    $stmt = $conn->prepare("SELECT * FROM events WHERE title LIKE ? OR location LIKE ? ORDER BY event_date ASC");
    $like = "%$search%";
    $stmt->bind_param("ss", $like, $like);
    $stmt->execute();
    $events = $stmt->get_result();
} else {
    $events = $conn->query("SELECT * FROM events ORDER BY event_date ASC");
}
include 'includes/header.php';
?>
<h1 class="page-title">All Events</h1>
<form method="GET" class="mb-2" style="display:flex; gap:1rem; max-width:500px;">
    <input type="text" name="search" placeholder="Search events..." value="<?= e($search) ?>"
           style="flex:1; padding:0.75rem; border:1px solid var(--border); border-radius:8px;">
    <button type="submit" class="btn btn-primary">Search</button>
</form>
<?php if ($events->num_rows === 0): ?>
    <div class="empty-state">No events found.</div>
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