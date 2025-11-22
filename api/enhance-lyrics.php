<?php
// api/enhance-lyrics.php
// Disable error display but enable logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Start output buffering to catch any accidental output
ob_start();

// Set headers early
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Function to send error response
function sendError($message, $code = 500, $details = null) {
    ob_clean();
    http_response_code($code);
    $response = ['success' => false, 'error' => $message];
    if ($details) {
        $response['details'] = $details;
    }
    echo json_encode($response);
    ob_end_flush();
    exit;
}

// Load config from outside public_html (preferred) or inside (fallback)
$configLoaded = false;
$configError = null;
try {
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
        // Check if file starts with <?php to avoid outputting PHP code
        $fileContent = @file_get_contents($configPath);
        if ($fileContent === false) {
            $configError = "Cannot read config.php file";
            error_log("Error: Cannot read config.php at $configPath");
        } else {
            $startsWithPhp = strpos(trim($fileContent), '<?php') === 0;
            
            if ($startsWithPhp) {
                // Capture any output from config.php
                ob_start();
                try {
                    require_once $configPath;
                    $output = ob_get_clean();
                    
                    // If config.php produced output, that's a problem
                    if (!empty($output)) {
                        error_log("Warning: config.php produced output: " . substr($output, 0, 200));
                        $configError = "config.php produced unexpected output";
                    } else {
                        $configLoaded = true;
                    }
                } catch (Throwable $e) {
                    ob_end_clean();
                    $configError = $e->getMessage();
                    error_log("Error requiring config.php: " . $e->getMessage());
                }
            } else {
                $configError = "config.php does not start with <?php tag";
                error_log("Error: config.php does not start with <?php tag");
            }
        }
    } else {
        $configError = "config.php file not found";
    }
} catch (Throwable $e) {
    $configError = $e->getMessage();
    error_log("Error loading config.php: " . $e->getMessage());
    $configLoaded = false;
}

// Define OPENAI_API_KEY if not defined (fallback)
if (!defined('OPENAI_API_KEY')) {
    define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Get input
$input = null;
try {
    $inputData = file_get_contents('php://input');
    if ($inputData === false) {
        sendError('Failed to read request data', 400);
    }
    $input = json_decode($inputData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON in request', 400, json_last_error_msg());
    }
} catch (Throwable $e) {
    sendError('Error parsing request', 400, $e->getMessage());
}

$lyrics = $input['lyrics'] ?? '';

if (empty(trim($lyrics))) {
    sendError('Lyrics are required', 400);
}

// Check if API key is defined and valid
if (!defined('OPENAI_API_KEY')) {
    sendError('OpenAI API key not defined', 500, $configError ?: 'config.php failed to load');
}

$apiKey = OPENAI_API_KEY;
if (empty($apiKey) || $apiKey === 'your-api-key-here') {
    sendError('OpenAI service not available. Please check your API key configuration.', 500, 
        $configLoaded ? 'API key is not set in config.php' : ($configError ?: 'config.php failed to load or is missing'));
}

// Prepare OpenAI API request
$prompt = "Please provide alternatives for lines with <insert> tags. For each line containing <insert>, provide 3-5 alternative completions. Return your response as a JSON object with this structure:

{
  \"lines\": [
    {
      \"lineNumber\": 1,
      \"original\": \"I'm walking down the street <insert>\",
      \"alternatives\": [
        \"I'm walking down the street where dreams come alive\",
        \"I'm walking down the street with hope in my eyes\",
        \"I'm walking down the street where love never dies\"
      ]
    }
  ]
}

Here are the lyrics:\n\n" . $lyrics . "\n\nReturn ONLY valid JSON, no other text.";

$messages = [
    [
        'role' => 'system',
        'content' => 'You are a creative lyrics assistant. You help enhance lyrics by providing multiple alternatives for lines that need completion. You MUST return ONLY valid JSON, no markdown code blocks, no explanations, no additional text. The JSON must be parseable.'
    ],
    [
        'role' => 'user',
        'content' => $prompt
    ]
];

// Make OpenAI API call using cURL
$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . OPENAI_API_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'gpt-4',
        'messages' => $messages,
        'max_tokens' => 2000,
        'temperature' => 0.7
    ]),
    // SSL options - disable verification for local development on Windows
    // On production (Hostinger), SSL verification will work correctly
    CURLOPT_SSL_VERIFYPEER => ($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8000' ? false : true,
    CURLOPT_SSL_VERIFYHOST => ($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8000' ? 0 : 2,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    sendError('Failed to connect to OpenAI API', 500, $curlError);
}

if ($httpCode !== 200) {
    $errorData = json_decode($response, true);
    $errorMessage = 'Unknown error';
    $errorCode = null;
    
    if ($errorData && isset($errorData['error'])) {
        $errorMessage = $errorData['error']['message'] ?? 'Unknown error';
        $errorCode = $errorData['error']['code'] ?? null;
    } else {
        // If we can't parse the error, show the raw response
        $errorMessage = substr($response, 0, 500);
    }
    
    // Handle specific error codes
    if ($errorCode === 'insufficient_quota') {
        $errorMessage = 'OpenAI API quota exceeded. Please check your account balance.';
    } elseif ($errorCode === 'invalid_api_key') {
        $errorMessage = 'Invalid OpenAI API key. Please check your configuration.';
    } elseif ($errorCode === 'rate_limit_exceeded') {
        $errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } elseif ($errorCode === 'model_not_found') {
        $errorMessage = 'Model not found. Please check the model name.';
    }
    
    ob_clean();
    sendError('OpenAI API error', 500, $errorMessage);
}

$data = json_decode($response, true);
$aiResponse = $data['choices'][0]['message']['content'] ?? '';

// Try to extract JSON from the response (in case it's wrapped in markdown)
$alternativesData = null;
if (preg_match('/\{.*\}/s', $aiResponse, $matches)) {
    $alternativesData = json_decode($matches[0], true);
}

// If we couldn't parse structured alternatives, fall back to simple text
if (!$alternativesData || !isset($alternativesData['lines'])) {
    // Fallback: return as simple enhanced text
    ob_clean();
    echo json_encode([
        'success' => true,
        'enhancedLyrics' => $aiResponse,
        'originalLyrics' => $lyrics,
        'alternatives' => null,
        'fallback' => true
    ]);
    ob_end_flush();
    exit;
}

// Parse the original lyrics to match with alternatives
$originalLines = explode("\n", $lyrics);
$linesWithAlternatives = [];
$usedLineIndices = [];

foreach ($alternativesData['lines'] as $altLine) {
    $original = $altLine['original'] ?? '';
    $alternatives = $altLine['alternatives'] ?? [];
    
    if (!empty($alternatives)) {
        // Find the line number in the original lyrics
        $lineNum = null;
        $cleanAlt = trim(str_replace(['<insert>', '<insert/>', '<insert />'], '', $original));
        
        // Try to find matching line
        foreach ($originalLines as $idx => $line) {
            if (in_array($idx, $usedLineIndices)) continue;
            
            $cleanOriginal = trim(str_replace(['<insert>', '<insert/>', '<insert />'], '', $line));
            
            // More flexible matching
            if (stripos($cleanOriginal, $cleanAlt) !== false || 
                stripos($cleanAlt, $cleanOriginal) !== false ||
                similar_text(strtolower($cleanOriginal), strtolower($cleanAlt)) > 70) {
                $lineNum = $idx + 1;
                $usedLineIndices[] = $idx;
                break;
            }
        }
        
        // If no match found, use the line number from AI or assign sequentially
        if ($lineNum === null) {
            $lineNum = $altLine['lineNumber'] ?? (count($linesWithAlternatives) + 1);
        }
        
        $linesWithAlternatives[] = [
            'lineNumber' => $lineNum,
            'original' => $original,
            'alternatives' => $alternatives
        ];
    }
}

ob_clean();
echo json_encode([
    'success' => true,
    'originalLyrics' => $lyrics,
    'alternatives' => $linesWithAlternatives,
    'fallback' => false
]);
ob_end_flush();

