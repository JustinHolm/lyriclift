<?php
// api/search-images.php
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
$query = strtolower(trim($input['query'] ?? ''));

if (empty($query)) {
    http_response_code(400);
    echo json_encode(['error' => 'Search query is required']);
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
    
    $imageFile = str_replace('.json', '.jpg', $jsonFile);
    $imagePath = $mediaFolder . '/' . $imageFile;
    
    if (file_exists($imagePath)) {
        // Score based on search query
        $description = strtolower($mediaItem['description'] ?? '');
        $tags = array_map('strtolower', $mediaItem['tags'] ?? []);
        
        $score = 0;
        $queryWords = explode(' ', $query);
        
        foreach ($queryWords as $word) {
            $word = trim($word);
            if (empty($word)) continue;
            
            // Check description
            if (strpos($description, $word) !== false) {
                $score += 5;
            }
            
            // Check tags
            foreach ($tags as $tag) {
                if (strpos($tag, $word) !== false) {
                    $score += 3;
                    break;
                }
            }
        }
        
        if ($score > 0) {
            $mediaItems[] = array_merge($mediaItem, [
                'imageFile' => $imageFile,
                'jsonFile' => $jsonFile,
                'score' => $score
            ]);
        }
    }
}

// Sort by score (highest first)
usort($mediaItems, function($a, $b) {
    return $b['score'] - $a['score'];
});

// Limit to top 20
$matchedImages = array_slice($mediaItems, 0, 20);
$matchedImages = array_map(function($item, $index) {
    return [
        'filename' => $item['imageFile'],
        'description' => $item['description'] ?? '',
        'tags' => $item['tags'] ?? [],
        'rank' => $index + 1
    ];
}, $matchedImages, array_keys($matchedImages));

echo json_encode([
    'success' => true,
    'matchedImages' => $matchedImages,
    'totalFound' => count($matchedImages)
]);

