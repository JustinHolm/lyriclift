<?php
// api/enhance-lyrics.php
// Start output buffering to catch any accidental output
ob_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Load config from outside public_html (preferred) or inside (fallback)
$configLoaded = false;
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
        $fileContent = file_get_contents($configPath);
        $startsWithPhp = strpos(trim($fileContent), '<?php') === 0;
        
        if ($startsWithPhp) {
            // Capture any output from config.php
            ob_start();
            require_once $configPath;
            $output = ob_get_clean();
            
            // If config.php produced output, that's a problem
            if (!empty($output)) {
                error_log("Warning: config.php produced output: " . substr($output, 0, 200));
            } else {
                $configLoaded = true;
            }
        } else {
            error_log("Error: config.php does not start with <?php tag");
        }
    }
} catch (Throwable $e) {
    error_log("Error loading config.php: " . $e->getMessage());
    $configLoaded = false;
}

// Define OPENAI_API_KEY if not defined (fallback)
if (!defined('OPENAI_API_KEY')) {
    define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    ob_end_flush();
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
$lyrics = $input['lyrics'] ?? '';

if (empty(trim($lyrics))) {
    ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Lyrics are required']);
    ob_end_flush();
    exit;
}

// Check if API key is defined and valid
if (!defined('OPENAI_API_KEY') || empty(OPENAI_API_KEY) || OPENAI_API_KEY === 'your-api-key-here') {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI service not available. Please check your API key configuration.',
        'details' => $configLoaded ? 'API key is not set in config.php' : 'config.php failed to load or is missing'
    ]);
    ob_end_flush();
    exit;
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
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to connect to OpenAI API',
        'details' => $curlError
    ]);
    ob_end_flush();
    exit;
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
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API error',
        'details' => $errorMessage,
        'code' => $errorCode,
        'http_code' => $httpCode
    ]);
    ob_end_flush();
    exit;
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

