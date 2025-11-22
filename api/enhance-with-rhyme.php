<?php
// api/enhance-with-rhyme.php - Enhanced lyrics with rhyme detection and multiple alternatives
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

// Enhanced prompt with rhyme detection
$prompt = "Analyze these lyrics and provide enhancement suggestions with focus on:

1. **Internal Rhyme Patterns**: Suggest alternatives that create internal rhymes (words that rhyme within the same line)
2. **End Rhyme**: Maintain or improve end-of-line rhyme schemes
3. **Slant Rhyme**: Suggest near-rhymes for creative flow
4. **Syllable Count**: Match syllable counts for consistent rhythm
5. **Multiple Alternatives**: Provide 5-7 creative alternatives per section
6. **Rhyme Scheme Analysis**: Suggest rhyme schemes (AABB, ABAB, ABCB, etc.)

For each section with <insert> tags, return:
{
  \"sections\": [
    {
      \"original\": \"I'm walking down the street <insert>\",
      \"alternatives\": [
        {
          \"text\": \"I'm walking down the street where dreams come alive\",
          \"rhymeType\": \"internal\",
          \"rhymeWords\": [\"street\", \"dreams\"],
          \"syllables\": 9,
          \"flow\": \"smooth, upbeat\",
          \"rhymeNote\": \"Internal rhyme: street/dreams\"
        },
        {
          \"text\": \"I'm walking down the street with hope in my eyes\",
          \"rhymeType\": \"end\",
          \"rhymeWords\": [\"alive\", \"eyes\"],
          \"syllables\": 9,
          \"flow\": \"contemplative\",
          \"rhymeNote\": \"End rhyme potential\"
        }
      ],
      \"suggestions\": {
        \"rhymeScheme\": \"AABB\",
        \"meter\": \"iambic\",
        \"recommendation\": \"Consider internal rhymes for stronger impact\"
      }
    }
  ]
}

Here are the lyrics:\n\n" . $lyrics . "\n\nReturn ONLY valid JSON, no markdown, no code blocks, no explanations.";

$messages = [
    [
        'role' => 'system',
        'content' => 'You are an expert lyricist and poetry analyst. You specialize in rhyme patterns, meter, and lyrical flow. You MUST return ONLY valid JSON that can be parsed directly. No markdown, no code blocks, no explanations.'
    ],
    [
        'role' => 'user',
        'content' => $prompt
    ]
];

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
        'max_tokens' => 3000,
        'temperature' => 0.8
    ]),
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
    $errorMessage = $errorData['error']['message'] ?? 'Unknown error';
    sendError('OpenAI API error', 500, $errorMessage);
}

$data = json_decode($response, true);
$aiResponse = trim($data['choices'][0]['message']['content'] ?? '');

// Extract JSON from response
$enhancementData = null;
if (preg_match('/\{.*\}/s', $aiResponse, $matches)) {
    $enhancementData = json_decode($matches[0], true);
}

if (!$enhancementData || !isset($enhancementData['sections'])) {
    // Fallback to basic enhancement
    sendError('Failed to parse enhancement data', 500, 'Response format invalid');
}

ob_clean();
echo json_encode([
    'success' => true,
    'sections' => $enhancementData['sections'] ?? [],
    'originalLyrics' => $lyrics
]);
ob_end_flush();

