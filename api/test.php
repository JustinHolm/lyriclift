<?php
// api/test.php - Simple test endpoint to debug 500 errors
header('Content-Type: text/plain');

echo "PHP is working!\n";
echo "PHP Version: " . PHP_VERSION . "\n\n";

// Test 1: Check if we can read files
echo "Test 1: File system access\n";
$configPath = __DIR__ . '/../config.php';
$configPathResolved = realpath($configPath); // This resolves api/../ to the actual path
$rootDir = dirname(__DIR__); // Parent of api/ = public_html/

echo "Current directory (api/): " . __DIR__ . "\n";
echo "Root directory (public_html/): " . $rootDir . "\n";
echo "Config path (relative): api/../config.php\n";
echo "Config path (resolved): " . ($configPathResolved ?: 'NOT FOUND') . "\n";
echo "Config should be at: " . $rootDir . "/config.php\n";
echo "Config exists: " . (file_exists($configPath) ? 'YES ✓' : 'NO ✗') . "\n";
echo "Config readable: " . (is_readable($configPath) ? 'YES ✓' : 'NO ✗') . "\n\n";

// Test 2: Try to include config
echo "Test 2: Loading config.php\n";
try {
    if (file_exists($configPath)) {
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

