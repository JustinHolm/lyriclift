<?php
// api/health.php - Health check endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Try to load config, but handle gracefully if missing
$configExists = file_exists(__DIR__ . '/../config.php');
if ($configExists) {
    require_once __DIR__ . '/../config.php';
}

$status = [
    'status' => 'ok',
    'config_file' => $configExists ? 'exists' : 'missing',
    'openai' => 'not configured',
    'media_folder' => 'unknown',
    'media_files' => 0,
    'timestamp' => date('c'),
    'php_version' => PHP_VERSION,
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown'
];

// Check OpenAI configuration if config exists
if ($configExists && defined('OPENAI_API_KEY')) {
    $status['openai'] = (!empty(OPENAI_API_KEY) && OPENAI_API_KEY !== 'your-api-key-here') ? 'configured' : 'not configured';
}

// Check media folder if config exists
if ($configExists && defined('MEDIA_FOLDER')) {
    $status['media_folder'] = is_dir(MEDIA_FOLDER) ? 'exists' : 'missing';
    
    // Count media files
    if (is_dir(MEDIA_FOLDER)) {
        $files = scandir(MEDIA_FOLDER);
        $jsonFiles = array_filter($files, function($file) {
            return pathinfo($file, PATHINFO_EXTENSION) === 'json';
        });
        $status['media_files'] = count($jsonFiles);
    }
} else {
    // Try default path
    $defaultMediaPath = __DIR__ . '/../media';
    $status['media_folder'] = is_dir($defaultMediaPath) ? 'exists' : 'missing';
}

// Add warning if config is missing
if (!$configExists) {
    $status['warning'] = 'config.php file is missing. Create it from config.php.example';
}

echo json_encode($status, JSON_PRETTY_PRINT);

