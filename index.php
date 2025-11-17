<?php
// index.php - Entry point for production (Hostinger)
// This file routes requests when .htaccess rewrite doesn't work

$requestUri = $_SERVER['REQUEST_URI'];
$parsedUrl = parse_url($requestUri);
$path = $parsedUrl['path'];

// Remove leading slash
$path = ltrim($path, '/');

// If accessing root, serve index.html
if ($path === '' || $path === '/') {
    $file = __DIR__ . '/public/index.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($file);
        exit;
    }
}

// Route API requests
if (strpos($path, 'api/') === 0) {
    $file = __DIR__ . '/' . $path;
    if (file_exists($file)) {
        require_once $file;
        exit;
    }
}

// Route public assets
if (strpos($path, 'public/') === 0) {
    $file = __DIR__ . '/' . $path;
    if (file_exists($file)) {
        return false; // Let server serve directly
    }
}

// Route media files
if (strpos($path, 'media/') === 0 || strpos($path, 'mp3/') === 0) {
    $file = __DIR__ . '/' . $path;
    if (file_exists($file)) {
        return false; // Let server serve directly
    }
}

// Route HTML pages
$htmlPages = [
    'index.html',
    'video-inspiration.html',
    'video-gallery.html',
    'audio-player.html',
    'audio-studio.html',
    'blockchain-registry.html'
];

if (in_array($path, $htmlPages)) {
    $file = __DIR__ . '/public/' . $path;
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=UTF-8');
        $html = file_get_contents($file);
        // Fix asset paths
        $html = str_replace('href="public/', 'href="/public/', $html);
        $html = str_replace('src="public/', 'src="/public/', $html);
        echo $html;
        exit;
    }
}

// 404 - File not found
http_response_code(404);
echo "404 - Page not found";
