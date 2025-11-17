<?php
// api/get-songs.php - List all saved songs
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Try to load config, handle errors gracefully (check outside public_html first)
try {
    $rootDir = dirname(__DIR__);
    $parentDir = dirname($rootDir);
    $configPath = null;
    foreach ([$parentDir . '/config.php', __DIR__ . '/../../config.php', $rootDir . '/config.php', __DIR__ . '/../config.php'] as $path) {
        if (file_exists($path)) {
            $configPath = $path;
            break;
        }
    }
    if ($configPath) {
        require_once $configPath;
    }
} catch (Throwable $e) {
    // Config failed to load, continue without it
}

$songsFolder = __DIR__ . '/../songs';
$songs = [];

if (is_dir($songsFolder)) {
    $files = glob($songsFolder . '/*.json');
    foreach ($files as $file) {
        $songData = json_decode(file_get_contents($file), true);
        if ($songData) {
            // Get latest version for preview
            $latestVersion = $songData['versions'][count($songData['versions']) - 1] ?? null;
            $preview = $latestVersion ? substr($latestVersion['lyrics'], 0, 100) : '';
            
            // Don't include full lyrics in list, just metadata
            $songs[] = [
                'id' => $songData['id'],
                'title' => $songData['title'],
                'created' => $songData['created'],
                'updated' => $songData['updated'],
                'preview' => $preview . (strlen($preview) >= 100 ? '...' : ''),
                'versionCount' => count($songData['versions']),
                'currentVersion' => $songData['currentVersion']
            ];
        }
    }
}

// Sort by updated date (newest first)
usort($songs, function($a, $b) {
    return strtotime($b['updated']) - strtotime($a['updated']);
});

echo json_encode([
    'success' => true,
    'songs' => $songs
]);

