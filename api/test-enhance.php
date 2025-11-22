<?php
// api/test-enhance.php - Test endpoint for enhance API diagnostics
header('Content-Type: text/plain');

echo "Enhance API Diagnostic Test\n";
echo "===========================\n\n";

// Test 1: Output buffering
echo "Test 1: Output Buffering\n";
ob_start();
echo "Output buffer test";
$output = ob_get_clean();
echo "Output buffering: " . ($output === "Output buffer test" ? "WORKING ✓" : "FAILED ✗") . "\n\n";

// Test 2: Config loading
echo "Test 2: Config Loading\n";
$rootDir = dirname(__DIR__);
$parentDir = dirname($rootDir);
$configPath = null;
$possiblePaths = [
    $parentDir . '/config.php',
    __DIR__ . '/../../config.php',
    $rootDir . '/config.php',
    __DIR__ . '/../config.php'
];

echo "Checking paths:\n";
foreach ($possiblePaths as $path) {
    $exists = file_exists($path);
    echo "  " . $path . ": " . ($exists ? "EXISTS" : "NOT FOUND") . "\n";
    if ($exists && !$configPath) {
        $configPath = $path;
    }
}

if ($configPath) {
    echo "\nConfig path found: " . $configPath . "\n";
    echo "Config readable: " . (is_readable($configPath) ? "YES ✓" : "NO ✗") . "\n";
    
    // Check file content
    $fileContent = file_get_contents($configPath);
    $startsWithPhp = strpos(trim($fileContent), '<?php') === 0;
    echo "Starts with <?php: " . ($startsWithPhp ? "YES ✓" : "NO ✗") . "\n";
    
    if (!$startsWithPhp) {
        echo "WARNING: First 100 chars: " . substr($fileContent, 0, 100) . "\n";
    }
    
    // Try to load config
    try {
        ob_start();
        require_once $configPath;
        $output = ob_get_clean();
        
        if (!empty($output)) {
            echo "WARNING: config.php produced output: " . substr($output, 0, 200) . "\n";
        } else {
            echo "Config loaded: SUCCESS ✓\n";
        }
    } catch (Throwable $e) {
        echo "Config load error: " . $e->getMessage() . "\n";
    }
} else {
    echo "\nConfig file: NOT FOUND ✗\n";
}

// Test 3: API Key
echo "\nTest 3: API Key\n";
if (defined('OPENAI_API_KEY')) {
    $keyValue = OPENAI_API_KEY;
    $keyLength = strlen($keyValue);
    echo "API Key defined: YES ✓\n";
    echo "API Key length: $keyLength\n";
    echo "API Key starts with: " . substr($keyValue, 0, 7) . "...\n";
    echo "API Key is valid: " . ($keyValue !== 'your-api-key-here' && !empty($keyValue) && $keyLength > 20 ? "YES ✓" : "NO ✗") . "\n";
} else {
    echo "API Key defined: NO ✗\n";
    echo "Trying environment variable...\n";
    $envKey = getenv('OPENAI_API_KEY');
    echo "Environment variable: " . ($envKey ? "SET (length: " . strlen($envKey) . ")" : "NOT SET") . "\n";
}

// Test 4: PHP Error Reporting
echo "\nTest 4: PHP Configuration\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Error Reporting: " . error_reporting() . "\n";
echo "Display Errors: " . ini_get('display_errors') . "\n";
echo "Log Errors: " . ini_get('log_errors') . "\n";

// Test 5: cURL
echo "\nTest 5: cURL\n";
if (function_exists('curl_init')) {
    echo "cURL extension: LOADED ✓\n";
    $ch = curl_init();
    if ($ch) {
        echo "cURL handle: CREATED ✓\n";
        curl_close($ch);
    }
} else {
    echo "cURL extension: NOT LOADED ✗\n";
}

echo "\nTest complete!\n";

