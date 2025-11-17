<?php
// api/get-audio.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Read all audio files from mp3 folder
$mp3Folder = __DIR__ . '/../mp3';
$audioFiles = [];

if (!is_dir($mp3Folder)) {
    http_response_code(404);
    echo json_encode(['error' => 'MP3 folder not found']);
    exit;
}

$files = scandir($mp3Folder);
$audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'];

// Find all audio files
foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    
    if (in_array($extension, $audioExtensions)) {
        $audioPath = $mp3Folder . '/' . $file;
        $audioInfo = [
            'filename' => $file,
            'extension' => $extension,
            'size' => file_exists($audioPath) ? filesize($audioPath) : 0,
            'modified' => file_exists($audioPath) ? filemtime($audioPath) : 0
        ];
        
        // Try to find corresponding JSON metadata in media folder
        $jsonFile = str_replace('.' . $extension, '.json', $file);
        $jsonPath = MEDIA_FOLDER . '/' . $jsonFile;
        
        if (file_exists($jsonPath)) {
            $jsonContent = file_get_contents($jsonPath);
            $metadata = json_decode($jsonContent, true);
            if ($metadata) {
                $audioInfo['description'] = $metadata['description'] ?? '';
                $audioInfo['tags'] = $metadata['tags'] ?? [];
            }
        }
        
        $audioFiles[] = $audioInfo;
    }
}

// Sort by modified date (newest first)
usort($audioFiles, function($a, $b) {
    return $b['modified'] - $a['modified'];
});

echo json_encode([
    'success' => true,
    'audioFiles' => $audioFiles,
    'total' => count($audioFiles)
]);

