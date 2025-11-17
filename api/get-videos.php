<?php
// api/get-videos.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Load config from outside public_html (preferred) or inside (fallback)
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read all video files from media folder
$mediaFolder = MEDIA_FOLDER;
$videos = [];

if (!is_dir($mediaFolder)) {
    http_response_code(404);
    echo json_encode(['error' => 'Media folder not found']);
    exit;
}

$files = scandir($mediaFolder);
$videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv'];

// Find all video files
foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    
    if (in_array($extension, $videoExtensions)) {
        $videoPath = $mediaFolder . '/' . $file;
        $videoInfo = [
            'filename' => $file,
            'extension' => $extension,
            'size' => file_exists($videoPath) ? filesize($videoPath) : 0,
            'modified' => file_exists($videoPath) ? filemtime($videoPath) : 0
        ];
        
        // Try to find corresponding JSON metadata
        $jsonFile = str_replace('.' . $extension, '.json', $file);
        $jsonPath = $mediaFolder . '/' . $jsonFile;
        
        if (file_exists($jsonPath)) {
            $jsonContent = file_get_contents($jsonPath);
            $metadata = json_decode($jsonContent, true);
            if ($metadata) {
                $videoInfo['description'] = $metadata['description'] ?? '';
                $videoInfo['tags'] = $metadata['tags'] ?? [];
            }
        }
        
        // Try to find corresponding thumbnail (first_frame.jpg)
        $thumbnailFile = str_replace('.' . $extension, '_first_frame.jpg', $file);
        $thumbnailPath = $mediaFolder . '/' . $thumbnailFile;
        
        if (file_exists($thumbnailPath)) {
            $videoInfo['thumbnail'] = $thumbnailFile;
        }
        
        $videos[] = $videoInfo;
    }
}

// Sort by modified date (newest first)
usort($videos, function($a, $b) {
    return $b['modified'] - $a['modified'];
});

echo json_encode([
    'success' => true,
    'videos' => $videos,
    'total' => count($videos)
]);

