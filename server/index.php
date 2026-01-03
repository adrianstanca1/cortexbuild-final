<?php
// Smart PHP Reverse Proxy for Hostinger
$node_port = 3002;

// Get the original REQUEST_URI
$request_uri = $_SERVER['REQUEST_URI'];

// Strip the index.php part if it's present in the URL (from the rewrite or direct access)
// e.g., /api/index.php/api/health -> /api/health
$request_uri = str_replace('/index.php', '', $request_uri);

$remote_url = "http://127.0.0.1:" . $node_port . $request_uri;

$ch = curl_init();

// Pass headers
$headers = array();
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host' && strtolower($key) !== 'content-length') {
        $headers[] = $key . ": " . $value;
    }
}

curl_setopt($ch, CURLOPT_URL, $remote_url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
} elseif ($method !== 'GET') {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header_content = substr($response, 0, $header_size);
$body_content = substr($response, $header_size);

$response_headers = explode("\r\n", $header_content);
foreach ($response_headers as $h) {
    if (
        !empty($h) &&
        strpos($h, 'Transfer-Encoding') === false &&
        strpos($h, 'Connection:') === false
    ) {
        header($h);
    }
}

echo $body_content;
curl_close($ch);
?>