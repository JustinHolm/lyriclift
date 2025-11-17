<?php
// api/test.php - Simple test endpoint to debug 500 errors
header('Content-Type: text/plain');

echo "PHP is working!\n";
echo "PHP Version: " . PHP_VERSION . "\n\n";

// Test 1: Check if we can read files
echo "Test 1: File system access\n";
$rootDir = dirname(__DIR__); // Parent of api/ = public_html/
$parentDir = dirname($rootDir); // Parent of public_html/ (outside web root)

// Try multiple locations
$possiblePaths = [
    $parentDir . '/config.php',  // Outside public_html (preferred for security)
    $rootDir . '/config.php',     // Inside public_html (fallback)
    __DIR__ . '/../../config.php', // Relative path outside
    __DIR__ . '/../config.php',    // Relative path inside
];

$configPath = null;
$configPathResolved = null;

foreach ($possiblePaths as $path) {
    if (file_exists($path)) {
        $configPath = $path;
        $configPathResolved = realpath($path) ?: $path;
        break;
    }
}

echo "Current directory (api/): " . __DIR__ . "\n";
echo "Root directory (public_html/): " . $rootDir . "\n";
echo "Parent directory (outside public_html/): " . $parentDir . "\n";
echo "Config path (resolved): " . ($configPathResolved ?: 'NOT FOUND') . "\n";
echo "Config exists: " . ($configPath ? 'YES ✓' : 'NO ✗') . "\n";
if ($configPath) {
    echo "Config readable: " . (is_readable($configPath) ? 'YES ✓' : 'NO ✗') . "\n";
}
echo "\n";

// Test 2: Try to include config
echo "Test 2: Loading config.php\n";
try {
    if ($configPath && file_exists($configPath)) {
        require_once $configPath;
        echo "Config loaded: SUCCESS\n";
        
        if (defined('OPENAI_API_KEY')) {
            $keyLength = strlen(OPENAI_API_KEY);
            echo "API Key defined: YES (length: $keyLength)\n";
            echo "API Key starts with: " . substr(OPENAI_API_KEY, 0, 7) . "...\n";
        } else {
            echo "API Key defined: NO\n";
        }
    } else {
        echo "Config loaded: FAILED (file not found)\n";
    }
} catch (Exception $e) {
    echo "Config loaded: ERROR - " . $e->getMessage() . "\n";
} catch (Error $e) {
    echo "Config loaded: FATAL ERROR - " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Check folders
echo "Test 3: Folder check\n";
$folders = ['songs', 'blockchain', 'media', 'mp3'];
foreach ($folders as $folder) {
    $path = __DIR__ . '/../' . $folder;
    echo "$folder: " . (is_dir($path) ? 'EXISTS' : 'MISSING') . "\n";
}

echo "\n";
echo "Test complete!\n";

