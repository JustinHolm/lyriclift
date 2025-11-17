<?php
// api/find-images.php
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
$lyrics = $input['lyrics'] ?? '';

if (empty(trim($lyrics))) {
    http_response_code(400);
    echo json_encode(['error' => 'Lyrics are required']);
    exit;
}

// Check API key
if (empty(OPENAI_API_KEY) || OPENAI_API_KEY === 'your-api-key-here') {
    http_response_code(500);
    echo json_encode([
        'error' => 'OpenAI service not available. Please check your API key configuration.',
        'details' => 'The OpenAI API key is not configured.'
    ]);
    exit;
}

// Read all JSON files from media folder
$mediaFolder = MEDIA_FOLDER;
$mediaItems = [];

if (!is_dir($mediaFolder)) {
    http_response_code(404);
    echo json_encode(['error' => 'Media folder not found']);
    exit;
}

$files = scandir($mediaFolder);
$jsonFiles = array_filter($files, function($file) {
    return pathinfo($file, PATHINFO_EXTENSION) === 'json';
});

if (empty($jsonFiles)) {
    http_response_code(404);
    echo json_encode(['error' => 'No media files found']);
    exit;
}

// Read and parse all JSON files
foreach ($jsonFiles as $jsonFile) {
    $jsonPath = $mediaFolder . '/' . $jsonFile;
    $jsonContent = file_get_contents($jsonPath);
    $mediaItem = json_decode($jsonContent, true);
    
    if ($mediaItem === null) {
        continue;
    }
    
    // Get the corresponding image file
    $imageFile = str_replace('.json', '.jpg', $jsonFile);
    $imagePath = $mediaFolder . '/' . $imageFile;
    
    if (file_exists($imagePath)) {
        $mediaItems[] = array_merge($mediaItem, [
            'imageFile' => $imageFile,
            'jsonFile' => $jsonFile
        ]);
    }
}

if (empty($mediaItems)) {
    http_response_code(404);
    echo json_encode(['error' => 'No valid media items found']);
    exit;
}

// Analyze lyrics with OpenAI
$lyricsAnalysisPrompt = "Analyze these lyrics and extract the key visual themes, emotions, and subjects:\n\n\"" . $lyrics . "\"\n\nReturn a JSON object with these fields:\n{\n  \"themes\": [\"array\", \"of\", \"main\", \"themes\"],\n  \"emotions\": [\"array\", \"of\", \"emotional\", \"tones\"],\n  \"subjects\": [\"array\", \"of\", \"main\", \"subjects\"],\n  \"colors\": [\"array\", \"of\", \"color\", \"associations\"],\n  \"atmosphere\": \"description of overall atmosphere\"\n}\n\nKeep it concise and focused on visual elements.";

$messages = [
    [
        'role' => 'system',
        'content' => 'You are an expert at analyzing lyrics for visual themes and emotional content. Return only valid JSON.'
    ],
    [
        'role' => 'user',
        'content' => $lyricsAnalysisPrompt
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
        'max_tokens' => 300,
        'temperature' => 0.3
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
curl_close($ch);

$lyricsAnalysis = null;
if ($httpCode === 200) {
    $data = json_decode($response, true);
    $analysisResponse = trim($data['choices'][0]['message']['content'] ?? '');
    
    // Try to extract JSON from response (in case it's wrapped in markdown)
    if (preg_match('/\{.*\}/s', $analysisResponse, $matches)) {
        $lyricsAnalysis = json_decode($matches[0], true);
    }
}

// Fallback to simple keyword extraction if analysis fails
if ($lyricsAnalysis === null) {
    $lyricsAnalysis = [
        'themes' => extractKeywords($lyrics),
        'emotions' => [],
        'subjects' => [],
        'colors' => [],
        'atmosphere' => ''
    ];
}

// Score each image
$scoredItems = array_map(function($item) use ($lyricsAnalysis, $lyrics) {
    $score = 0;
    $description = strtolower($item['description'] ?? '');
    $tags = array_map('strtolower', $item['tags'] ?? []);
    $scoringDetails = [];
    
    // Score based on themes
    if (!empty($lyricsAnalysis['themes'])) {
        foreach ($lyricsAnalysis['themes'] as $theme) {
            $themeLower = strtolower($theme);
            if (strpos($description, $themeLower) !== false) {
                $score += 5;
                $scoringDetails[] = "+5: Theme \"$theme\" found in description";
            }
            foreach ($tags as $tag) {
                if (strpos($tag, $themeLower) !== false) {
                    $score += 3;
                    $scoringDetails[] = "+3: Theme \"$theme\" found in tags";
                    break;
                }
            }
        }
    }
    
    // Score based on emotions
    if (!empty($lyricsAnalysis['emotions'])) {
        foreach ($lyricsAnalysis['emotions'] as $emotion) {
            $emotionLower = strtolower($emotion);
            if (strpos($description, $emotionLower) !== false) {
                $score += 4;
                $scoringDetails[] = "+4: Emotion \"$emotion\" found in description";
            }
            foreach ($tags as $tag) {
                if (strpos($tag, $emotionLower) !== false) {
                    $score += 2;
                    $scoringDetails[] = "+2: Emotion \"$emotion\" found in tags";
                    break;
                }
            }
        }
    }
    
    // Score based on subjects
    if (!empty($lyricsAnalysis['subjects'])) {
        foreach ($lyricsAnalysis['subjects'] as $subject) {
            $subjectLower = strtolower($subject);
            if (strpos($description, $subjectLower) !== false) {
                $score += 4;
                $scoringDetails[] = "+4: Subject \"$subject\" found in description";
            }
            foreach ($tags as $tag) {
                if (strpos($tag, $subjectLower) !== false) {
                    $score += 2;
                    $scoringDetails[] = "+2: Subject \"$subject\" found in tags";
                    break;
                }
            }
        }
    }
    
    // Score based on colors
    if (!empty($lyricsAnalysis['colors'])) {
        foreach ($lyricsAnalysis['colors'] as $color) {
            $colorLower = strtolower($color);
            if (strpos($description, $colorLower) !== false) {
                $score += 2;
                $scoringDetails[] = "+2: Color \"$color\" found in description";
            }
        }
    }
    
    // Score based on atmosphere
    if (!empty($lyricsAnalysis['atmosphere'])) {
        $atmosphereLower = strtolower($lyricsAnalysis['atmosphere']);
        if (strpos($description, $atmosphereLower) !== false) {
            $score += 3;
            $scoringDetails[] = "+3: Atmosphere match found in description";
        }
    }
    
    // Additional scoring for common patterns
    $lyricsLower = strtolower($lyrics);
    
    // Space/astronomical themes
    if ((strpos($description, 'space') !== false || strpos($description, 'astronaut') !== false || strpos($description, 'planet') !== false) &&
        (strpos($lyricsLower, 'star') !== false || strpos($lyricsLower, 'space') !== false || strpos($lyricsLower, 'moon') !== false)) {
        $score += 8;
        $scoringDetails[] = "+8: Strong space theme match";
    }
    
    // Nature/landscape themes
    if ((strpos($description, 'mountain') !== false || strpos($description, 'ocean') !== false || strpos($description, 'forest') !== false) &&
        (strpos($lyricsLower, 'mountain') !== false || strpos($lyricsLower, 'sea') !== false || strpos($lyricsLower, 'nature') !== false)) {
        $score += 8;
        $scoringDetails[] = "+8: Strong nature theme match";
    }
    
    // Urban/city themes
    if ((strpos($description, 'city') !== false || strpos($description, 'street') !== false || strpos($description, 'urban') !== false) &&
        (strpos($lyricsLower, 'city') !== false || strpos($lyricsLower, 'street') !== false || strpos($lyricsLower, 'urban') !== false)) {
        $score += 8;
        $scoringDetails[] = "+8: Strong urban theme match";
    }
    
    // Night/dark themes
    if ((strpos($description, 'night') !== false || strpos($description, 'dark') !== false || strpos($description, 'moonlight') !== false) &&
        (strpos($lyricsLower, 'night') !== false || strpos($lyricsLower, 'dark') !== false || strpos($lyricsLower, 'moon') !== false)) {
        $score += 6;
        $scoringDetails[] = "+6: Night/dark theme match";
    }
    
    // Light/bright themes
    if ((strpos($description, 'sun') !== false || strpos($description, 'light') !== false || strpos($description, 'bright') !== false) &&
        (strpos($lyricsLower, 'sun') !== false || strpos($lyricsLower, 'light') !== false || strpos($lyricsLower, 'bright') !== false)) {
        $score += 6;
        $scoringDetails[] = "+6: Light/bright theme match";
    }
    
    $item['score'] = $score;
    $item['scoringDetails'] = $scoringDetails;
    return $item;
}, $mediaItems);

// Sort by score and take top 10
usort($scoredItems, function($a, $b) {
    return $b['score'] - $a['score'];
});

$matchedImages = array_slice($scoredItems, 0, 10);
$matchedImages = array_map(function($item, $index) {
    return [
        'filename' => $item['imageFile'],
        'description' => $item['description'] ?? '',
        'tags' => $item['tags'] ?? [],
        'relevance' => $index === 0 ? 'Most Relevant' : "Rank " . ($index + 1),
        'score' => $item['score'],
        'scoringDetails' => $item['scoringDetails'],
        'rank' => $index + 1
    ];
}, $matchedImages, array_keys($matchedImages));

echo json_encode([
    'success' => true,
    'matchedImages' => $matchedImages,
    'totalImages' => count($mediaItems),
    'analysis' => $lyricsAnalysis
]);

// Helper function
function extractKeywords($lyrics) {
    $commonThemes = [
        'space', 'star', 'moon', 'sun', 'light', 'dark', 'night',
        'mountain', 'ocean', 'sea', 'river', 'forest', 'nature',
        'city', 'street', 'urban', 'building', 'road',
        'love', 'heart', 'soul', 'spirit', 'dream', 'hope',
        'fire', 'water', 'earth', 'wind', 'sky', 'cloud'
    ];
    
    $lyricsLower = strtolower($lyrics);
    return array_values(array_filter($commonThemes, function($theme) use ($lyricsLower) {
        return strpos($lyricsLower, $theme) !== false;
    }));
}

