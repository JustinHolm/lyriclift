<?php
// router.php - Router for PHP built-in development server
// This file is only needed for local testing with php -S

$requestUri = $_SERVER['REQUEST_URI'];
$parsedUrl = parse_url($requestUri);
$path = $parsedUrl['path'];

// Remove leading slash
$path = ltrim($path, '/');

// Route API requests
if (strpos($path, 'api/') === 0) {
    $file = __DIR__ . '/' . $path;
    if (file_exists($file)) {
        return false; // Let PHP serve the file directly
    }
}

// Route media requests
if (strpos($path, 'media/') === 0) {
    $file = __DIR__ . '/' . $path;
    if (file_exists($file)) {
        return false; // Let PHP serve the file directly
    }
}

// Route mp3 requests
if (strpos($path, 'mp3/') === 0) {
    // Decode URL-encoded filename
    $mp3Path = substr($path, 4); // Remove 'mp3/' prefix
    $decodedPath = urldecode($mp3Path);
    $file = __DIR__ . '/mp3/' . $decodedPath;
    
    // Also try with encoded path in case decoding isn't needed
    if (!file_exists($file)) {
        $file = __DIR__ . '/mp3/' . $mp3Path;
    }
    
    if (file_exists($file) && is_file($file)) {
        // Set proper content type for audio
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $contentTypes = [
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a' => 'audio/mp4',
            'aac' => 'audio/aac',
            'flac' => 'audio/flac',
            'wma' => 'audio/x-ms-wma'
        ];
        
        if (isset($contentTypes[$extension])) {
            header('Content-Type: ' . $contentTypes[$extension]);
        }
        
        // Set headers for audio streaming
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=3600');
        
        readfile($file);
        return true;
    }
}

// Handle video-inspiration.html explicitly (before general public assets)
if ($path === 'video-inspiration.html') {
    $file = __DIR__ . '/public/video-inspiration.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths to work from root
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        return true;
    }
}

// Handle video-gallery.html explicitly
if ($path === 'video-gallery.html') {
    $file = __DIR__ . '/public/video-gallery.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths to work from root
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        return true;
    }
}

// Handle audio-player.html explicitly
if ($path === 'audio-player.html') {
    $file = __DIR__ . '/public/audio-player.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths to work from root
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        return true;
    }
}

// Handle audio-studio.html explicitly
if ($path === 'audio-studio.html') {
    $file = __DIR__ . '/public/audio-studio.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths to work from root
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        return true;
    }
}

// Handle blockchain-registry.html explicitly
if ($path === 'blockchain-registry.html') {
    $file = __DIR__ . '/public/blockchain-registry.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths to work from root
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        return true;
    }
}

// Route public assets
if (strpos($path, 'public/') === 0 || 
    in_array($path, ['styles.css', 'script.js', 'index.html', 'video-inspiration.js', 'video-gallery.js', 'audio-player.js'])) {
    if (in_array($path, ['styles.css', 'script.js', 'index.html', 'video-inspiration.js', 'video-gallery.js', 'audio-player.js'])) {
        $file = __DIR__ . '/public/' . $path;
    } else {
        $file = __DIR__ . '/' . $path;
    }
    if (file_exists($file)) {
        return false; // Let PHP serve the file directly
    }
}

// Default to index.php
if ($path === '' || $path === '/') {
    require __DIR__ . '/index.php';
    return true;
}

// Try to serve the file if it exists
$file = __DIR__ . '/' . $path;
if (file_exists($file) && is_file($file)) {
    return false; // Let PHP serve the file
}

// 404
http_response_code(404);
echo "404 - File Not Found: " . htmlspecialchars($path);
return true;

