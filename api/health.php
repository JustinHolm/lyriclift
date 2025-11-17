<?php
// api/health.php - Health check endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

$status = [
    'status' => 'ok',
    'openai' => (!empty(OPENAI_API_KEY) && OPENAI_API_KEY !== 'your-api-key-here') ? 'configured' : 'not configured',
    'media_folder' => is_dir(MEDIA_FOLDER) ? 'exists' : 'missing',
    'media_files' => 0,
    'timestamp' => date('c'),
    'php_version' => PHP_VERSION
];

// Count media files
if (is_dir(MEDIA_FOLDER)) {
    $files = scandir(MEDIA_FOLDER);
    $jsonFiles = array_filter($files, function($file) {
        return pathinfo($file, PATHINFO_EXTENSION) === 'json';
    });
    $status['media_files'] = count($jsonFiles);
}

echo json_encode($status, JSON_PRETTY_PRINT);

