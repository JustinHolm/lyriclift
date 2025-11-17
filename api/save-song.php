<?php
// api/save-song.php - Save or update a song with versioning
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
$songId = $input['id'] ?? null;
$title = $input['title'] ?? 'Untitled Song';
$lyrics = $input['lyrics'] ?? '';
$enhancedLyrics = $input['enhancedLyrics'] ?? '';
$saveAsNewVersion = $input['saveAsNewVersion'] ?? false;
$versionNotes = $input['versionNotes'] ?? '';
$authors = $input['authors'] ?? [];
$registerBlockchain = $input['registerBlockchain'] ?? false;

if (empty($lyrics)) {
    http_response_code(400);
    echo json_encode(['error' => 'Lyrics are required']);
    exit;
}

$songsFolder = __DIR__ . '/../songs';
if (!is_dir($songsFolder)) {
    mkdir($songsFolder, 0755, true);
}

// Generate ID if new song
if (!$songId) {
    $songId = uniqid('song_', true);
    $songData = [
        'id' => $songId,
        'title' => $title,
        'versions' => [],
        'currentVersion' => 0,
        'created' => date('c'),
        'updated' => date('c')
    ];
} else {
    // Load existing song
    $filePath = $songsFolder . '/' . $songId . '.json';
    if (file_exists($filePath)) {
        $songData = json_decode(file_get_contents($filePath), true);
        if (!$songData) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to read song file']);
            exit;
        }
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Song not found']);
        exit;
    }
}

// Determine if we're creating a new version or updating current
$isNewVersion = $saveAsNewVersion || 
                empty($songData['versions']) || 
                ($lyrics !== ($songData['versions'][count($songData['versions']) - 1]['lyrics'] ?? ''));

if ($isNewVersion) {
    // Create new version
    $newVersionNumber = count($songData['versions']) + 1;
    $songData['versions'][] = [
        'version' => $newVersionNumber,
        'lyrics' => $lyrics,
        'enhancedLyrics' => $enhancedLyrics,
        'created' => date('c'),
        'notes' => $versionNotes
    ];
    $songData['currentVersion'] = $newVersionNumber;
} else {
    // Update current version
    $currentVersionIndex = count($songData['versions']) - 1;
    if ($currentVersionIndex >= 0) {
        $songData['versions'][$currentVersionIndex]['lyrics'] = $lyrics;
        $songData['versions'][$currentVersionIndex]['enhancedLyrics'] = $enhancedLyrics;
        if ($versionNotes) {
            $songData['versions'][$currentVersionIndex]['notes'] = $versionNotes;
        }
        $songData['versions'][$currentVersionIndex]['created'] = date('c'); // Update timestamp
    }
}

$songData['title'] = $title;
$songData['updated'] = date('c');

// Add authors to song data (if not already set or if updating)
if (!empty($authors)) {
    $songData['authors'] = $authors;
    $songData['authorCount'] = count($authors);
}

// Register to blockchain if requested
$blockchainResult = null;
if ($registerBlockchain) {
    $blockchainResponse = file_get_contents('http://' . $_SERVER['HTTP_HOST'] . '/api/blockchain-register.php', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode([
                'songId' => $songId,
                'lyrics' => $lyrics,
                'title' => $title,
                'authors' => $authors
            ])
        ]
    ]));
    
    if ($blockchainResponse) {
        $blockchainData = json_decode($blockchainResponse, true);
        if ($blockchainData && $blockchainData['success']) {
            $blockchainResult = $blockchainData['registration'];
            $songData['blockchain'] = $blockchainResult;
        }
    }
}

$filePath = $songsFolder . '/' . $songId . '.json';
file_put_contents($filePath, json_encode($songData, JSON_PRETTY_PRINT));

// Return current version data
$currentVersion = $songData['versions'][count($songData['versions']) - 1] ?? null;

echo json_encode([
    'success' => true,
    'song' => $songData,
    'currentVersion' => $currentVersion,
    'isNewVersion' => $isNewVersion,
    'blockchainRegistered' => $blockchainResult !== null,
    'blockchain' => $blockchainResult
]);

