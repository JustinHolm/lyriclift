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
        // Check if file starts with <?php
        $fileContent = file_get_contents($configPath);
        $startsWithPhp = strpos(trim($fileContent), '<?php') === 0;
        echo "File starts with <?php: " . ($startsWithPhp ? 'YES ✓' : 'NO ✗') . "\n";
        
        if (!$startsWithPhp) {
            echo "WARNING: config.php should start with <?php\n";
            echo "First 100 characters: " . substr($fileContent, 0, 100) . "\n";
        }
        
        // Capture any output
        ob_start();
        require_once $configPath;
        $output = ob_get_clean();
        
        if (!empty($output)) {
            echo "WARNING: config.php produced output: " . substr($output, 0, 200) . "\n";
        }
        
        echo "Config loaded: SUCCESS\n";
        
        if (defined('OPENAI_API_KEY')) {
            $keyValue = OPENAI_API_KEY;
            $keyLength = strlen($keyValue);
            echo "API Key defined: YES (length: $keyLength)\n";
            echo "API Key starts with: " . substr($keyValue, 0, 7) . "...\n";
            echo "API Key is set (not default): " . ($keyValue !== 'your-api-key-here' && !empty($keyValue) ? 'YES ✓' : 'NO ✗') . "\n";
        } else {
            echo "API Key defined: NO\n";
            echo "Checking all defined constants with 'OPENAI' in name:\n";
            $allConstants = get_defined_constants(true);
            foreach ($allConstants['user'] ?? [] as $name => $value) {
                if (stripos($name, 'OPENAI') !== false) {
                    echo "  Found: $name\n";
                }
            }
        }
    } else {
        echo "Config loaded: FAILED (file not found)\n";
    }
} catch (Exception $e) {
    echo "Config loaded: ERROR - " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "Config loaded: FATAL ERROR - " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
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

