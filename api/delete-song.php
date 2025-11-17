<?php
// api/delete-song.php - Delete a song
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
$songId = $input['id'] ?? '';

if (empty($songId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Song ID is required']);
    exit;
}

$filePath = __DIR__ . '/../songs/' . $songId . '.json';

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Song not found']);
    exit;
}

if (!unlink($filePath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete song']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Song deleted successfully'
]);

