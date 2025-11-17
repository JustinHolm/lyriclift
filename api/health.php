<?php
// api/health.php - Health check endpoint
// Enable error display temporarily for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Try to load config, but handle gracefully if missing
$configExists = false;
$configError = null;
$configPath = null;

try {
    // Try multiple possible locations (check outside public_html first for security)
    $rootDir = dirname(__DIR__); // public_html/
    $parentDir = dirname($rootDir); // Parent of public_html/
    
    $possiblePaths = [
        $parentDir . '/config.php',  // Outside public_html (preferred for security)
        __DIR__ . '/../../config.php',  // Relative path outside
        dirname(__DIR__) . '/config.php',  // Inside public_html (fallback)
        __DIR__ . '/../config.php',  // Relative path inside
        $_SERVER['DOCUMENT_ROOT'] . '/config.php',  // From document root
    ];
    
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $configPath = realpath($path) ?: $path;
            $configExists = true;
            require_once $path;
            break;
        }
    }
    
    // If still not found, try the first path anyway (might be permission issue)
    if (!$configExists) {
        $configPath = __DIR__ . '/../config.php';
    }
} catch (Throwable $e) {
    $configError = $e->getMessage();
    $configExists = false;
}

$status = [
    'status' => 'ok',
    'config_file' => $configExists ? 'exists' : 'missing',
    'config_error' => $configError,
    'config_path' => $configPath ? (realpath($configPath) ?: $configPath) : (__DIR__ . '/../config.php'),
    'openai' => 'not configured',
    'media_folder' => 'unknown',
    'media_files' => 0,
    'timestamp' => date('c'),
    'php_version' => PHP_VERSION,
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown'
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

