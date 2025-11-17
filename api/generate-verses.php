<?php
// api/generate-verses.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Try to load config, handle errors gracefully
try {
    $configPath = __DIR__ . '/../config.php';
    if (file_exists($configPath)) {
        require_once $configPath;
    }
} catch (Throwable $e) {
    // Config failed to load, use defaults
}

// Define OPENAI_API_KEY if not defined
if (!defined('OPENAI_API_KEY')) {
    define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$imageDescription = $input['imageDescription'] ?? '';
$imageTags = $input['imageTags'] ?? [];
$sampleLyrics = $input['sampleLyrics'] ?? '';

if (empty($sampleLyrics)) {
    http_response_code(400);
    echo json_encode(['error' => 'Sample lyrics are required']);
    exit;
}

if (empty(OPENAI_API_KEY) || OPENAI_API_KEY === 'your-api-key-here') {
    http_response_code(500);
    echo json_encode([
        'error' => 'OpenAI service not available. Please check your API key configuration.'
    ]);
    exit;
}

// Build prompt
$tagsText = !empty($imageTags) ? 'Tags: ' . implode(', ', $imageTags) . "\n" : '';
$prompt = "Based on this image description and the sample lyrics provided, generate 3-5 alternate verses that match the visual theme and style of the sample lyrics.

Image Description: {$imageDescription}
{$tagsText}
Sample Lyrics:
{$sampleLyrics}

Generate alternate verses that:
1. Match the tone and style of the sample lyrics
2. Relate to the visual themes in the image description
3. Are creative and inspiring
4. Maintain similar structure/rhythm if applicable
5. Each verse must be exactly 4 lines

IMPORTANT: Each verse must consist of exactly 4 lines. Return each verse separated by a blank line. Format like this:

Verse 1 line 1
Verse 1 line 2
Verse 1 line 3
Verse 1 line 4

Verse 2 line 1
Verse 2 line 2
Verse 2 line 3
Verse 2 line 4

Do not include verse numbers or labels, just the 4 lines for each verse separated by blank lines.";

$messages = [
    [
        'role' => 'system',
        'content' => 'You are a creative lyricist who writes verses that match visual themes and maintain stylistic consistency.'
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
        'max_tokens' => 1000,
        'temperature' => 0.8
    ]),
    // SSL options - disable verification for local development on Windows
    CURLOPT_SSL_VERIFYPEER => ($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8000' ? false : true,
    CURLOPT_SSL_VERIFYHOST => ($_SERVER['HTTP_HOST'] ?? '') === 'localhost:8000' ? 0 : 2,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(500);
    $errorData = json_decode($response, true);
    $errorMessage = $errorData['error']['message'] ?? $error ?? 'OpenAI API error';
    
    echo json_encode([
        'error' => 'Failed to generate verses',
        'details' => $errorMessage
    ]);
    exit;
}

$data = json_decode($response, true);
$versesText = trim($data['choices'][0]['message']['content'] ?? '');

if (empty($versesText)) {
    http_response_code(500);
    echo json_encode(['error' => 'No verses generated']);
    exit;
}

// Split into verses by blank lines (double newlines)
$verseBlocks = preg_split('/\n\s*\n/', $versesText);
$verses = [];

foreach ($verseBlocks as $block) {
    $block = trim($block);
    if (empty($block)) continue;
    
    // Split block into lines
    $lines = explode("\n", $block);
    $verseLines = [];
    
    foreach ($lines as $line) {
        $line = trim($line);
        // Remove leading numbers and punctuation (e.g., "1.", "2)", "3 -", "Verse 1:")
        $line = preg_replace('/^(verse\s*\d+[:\-\.\)\s]*|\d+[\.\)\-\s]*)/i', '', $line);
        $line = trim($line);
        
        if (!empty($line)) {
            $verseLines[] = $line;
        }
    }
    
    // Combine lines into a 4-line verse
    // If we have more than 4 lines, take first 4
    // If we have less than 4 lines, pad with empty lines or combine
    if (count($verseLines) >= 4) {
        // Take exactly 4 lines
        $verse = implode("\n", array_slice($verseLines, 0, 4));
    } else if (count($verseLines) > 0) {
        // If less than 4 lines, use what we have (AI might have combined lines)
        $verse = implode("\n", $verseLines);
        // Pad to 4 lines if needed
        while (substr_count($verse, "\n") < 3) {
            $verse .= "\n";
        }
    } else {
        continue; // Skip empty blocks
    }
    
    if (!empty(trim($verse))) {
        $verses[] = $verse;
    }
}

// If we didn't get verses by blank lines, try splitting by line count (every 4 lines)
if (count($verses) < 2) {
    $allLines = array_filter(array_map('trim', explode("\n", $versesText)), function($line) {
        $line = preg_replace('/^(verse\s*\d+[:\-\.\)\s]*|\d+[\.\)\-\s]*)/i', '', trim($line));
        return !empty($line);
    });
    
    // Group into 4-line verses
    $verses = [];
    $currentVerse = [];
    foreach ($allLines as $line) {
        $currentVerse[] = $line;
        if (count($currentVerse) === 4) {
            $verses[] = implode("\n", $currentVerse);
            $currentVerse = [];
        }
    }
    // Add remaining lines as last verse if any
    if (!empty($currentVerse)) {
        while (count($currentVerse) < 4) {
            $currentVerse[] = '';
        }
        $verses[] = implode("\n", $currentVerse);
    }
}

// Ensure we have at least some content
if (empty($verses)) {
    // Fallback: split the whole text into 4-line chunks
    $allLines = array_filter(array_map('trim', explode("\n", $versesText)));
    $verses = [];
    for ($i = 0; $i < count($allLines); $i += 4) {
        $verseLines = array_slice($allLines, $i, 4);
        while (count($verseLines) < 4) {
            $verseLines[] = '';
        }
        $verses[] = implode("\n", $verseLines);
    }
}

echo json_encode([
    'success' => true,
    'verses' => $verses
]);

