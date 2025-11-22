<?php
// api/enhance-with-rhyme.php - Enhanced lyrics with rhyme detection and multiple alternatives
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
    $errorMessage = $errorData['error']['message'] ?? 'Unknown error';
    
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'OpenAI API error',
        'details' => $errorMessage
    ]);
    ob_end_flush();
    exit;
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
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to parse enhancement data',
        'fallback' => true
    ]);
    ob_end_flush();
    exit;
}

ob_clean();
echo json_encode([
    'success' => true,
    'sections' => $enhancementData['sections'] ?? [],
    'originalLyrics' => $lyrics
]);
ob_end_flush();

