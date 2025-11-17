<?php
// api/get-song.php - Get a specific song by ID (with optional version)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

$songId = $_GET['id'] ?? '';
$version = isset($_GET['version']) ? intval($_GET['version']) : null;

if (empty($songId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Song ID is required']);
    exit;
}

$filePath = __DIR__ . '/../songs/' . $songId . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Song not found']);
    exit;
}

$songData = json_decode(file_get_contents($filePath), true);

if (!$songData) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to read song file']);
    exit;
}

// If specific version requested, return that version
if ($version !== null) {
    $versionData = null;
    foreach ($songData['versions'] as $v) {
        if ($v['version'] == $version) {
            $versionData = $v;
            break;
        }
    }
    
    if (!$versionData) {
        http_response_code(404);
        echo json_encode(['error' => 'Version not found']);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'song' => $songData,
        'version' => $versionData
    ]);
    exit;
}

// Return latest version by default
$currentVersion = $songData['versions'][count($songData['versions']) - 1] ?? null;

echo json_encode([
    'success' => true,
    'song' => $songData,
    'currentVersion' => $currentVersion
]);

