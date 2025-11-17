<?php
// api/blockchain-register.php - Register song to blockchain for ownership
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
$songId = $input['songId'] ?? '';
$lyrics = $input['lyrics'] ?? '';
$title = $input['title'] ?? '';
$authors = $input['authors'] ?? [];

if (empty($songId) || empty($lyrics)) {
    http_response_code(400);
    echo json_encode(['error' => 'Song ID and lyrics are required']);
    exit;
}

// Create hash of lyrics for blockchain
$lyricsHash = hash('sha256', $lyrics);
$timestamp = time();
$date = date('c');

// Create metadata object
$metadata = [
    'songId' => $songId,
    'title' => $title,
    'lyricsHash' => $lyricsHash,
    'authors' => $authors,
    'timestamp' => $timestamp,
    'date' => $date,
    'version' => '1.0'
];

// For now, we'll store the registration locally
// In production, you would integrate with:
// - IPFS for decentralized storage
// - Ethereum/Smart Contracts for ownership
// - Arweave for permanent storage
// - Or another blockchain solution

$blockchainFolder = __DIR__ . '/../blockchain';
if (!is_dir($blockchainFolder)) {
    mkdir($blockchainFolder, 0755, true);
}

// Create registration record
$registrationId = uniqid('reg_', true);
$registration = [
    'id' => $registrationId,
    'songId' => $songId,
    'lyricsHash' => $lyricsHash,
    'title' => $title,
    'authors' => $authors,
    'timestamp' => $timestamp,
    'date' => $date,
    'status' => 'registered',
    'metadata' => $metadata,
    // Placeholder for actual blockchain integration
    'blockchain' => [
        'network' => 'pending', // Would be 'ethereum', 'polygon', etc.
        'transactionHash' => null, // Would contain actual tx hash
        'blockNumber' => null,
        'ipfsHash' => null, // If using IPFS
        'contractAddress' => null // If using smart contracts
    ]
];

// Save registration
$filePath = $blockchainFolder . '/' . $registrationId . '.json';
file_put_contents($filePath, json_encode($registration, JSON_PRETTY_PRINT));

// TODO: Integrate with actual blockchain service
// Example integrations:
// 1. IPFS: Upload metadata to IPFS, get hash
// 2. Ethereum: Create transaction to smart contract
// 3. Arweave: Upload to Arweave for permanent storage

echo json_encode([
    'success' => true,
    'registration' => $registration,
    'message' => 'Song registered for blockchain ownership. Actual blockchain integration pending.'
]);

