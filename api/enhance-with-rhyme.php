<?php
// api/enhance-with-rhyme.php - Enhanced lyrics with rhyme detection and multiple alternatives
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$lyrics = $input['lyrics'] ?? '';

if (empty(trim($lyrics))) {
    http_response_code(400);
    echo json_encode(['error' => 'Lyrics are required']);
    exit;
}

if (empty(OPENAI_API_KEY) || OPENAI_API_KEY === 'your-api-key-here') {
    http_response_code(500);
    echo json_encode([
        'error' => 'OpenAI service not available. Please check your API key configuration.'
    ]);
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
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to connect to OpenAI API',
        'details' => $curlError
    ]);
    exit;
}

if ($httpCode !== 200) {
    $errorData = json_decode($response, true);
    $errorMessage = $errorData['error']['message'] ?? 'Unknown error';
    
    http_response_code(500);
    echo json_encode([
        'error' => 'OpenAI API error',
        'details' => $errorMessage
    ]);
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
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to parse enhancement data',
        'fallback' => true
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'sections' => $enhancementData['sections'] ?? [],
    'originalLyrics' => $lyrics
]);

