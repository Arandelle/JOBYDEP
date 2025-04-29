<?php
//validate authentication token
session_start();
header('Content-Type: application/json');

//get token from request headers
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = '';

//extract token
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

//validate token againts session
if (!empty($token) && isset($_SESSION['auth_token']) && $token === $_SESSION['auth_token']) {
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['email']
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid or expired token'
    ]);
}

?>
