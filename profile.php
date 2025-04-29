<?php
// profile.php - Get user profile information from MySQL
session_start();
header('Content-Type: application/json');

// Include database connection
require_once 'database_ojt.php';

// Get token from request headers
$headers = getallheaders();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$token = '';

$conn = getDbConnection();

// Extract token
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Validate token
if (!empty($token) && isset($_SESSION['auth_token']) && $token === $_SESSION['auth_token']) {
        
    // Get user ID from session
    $userId = $_SESSION['user_id'];
    
    // Prepare SQL statement
    $stmt = $conn->prepare("SELECT id, username, email, full_name, join_date, bio FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if($result->num_rows == 1) {
        $profile = $result->fetch_assoc();
        
        echo json_encode([
            'success' => true,
            'profile' => [
                'id' => $profile['id'],
                'username' => $profile['username'],
                'email' => $profile['email'],
                'fullName' => $profile['full_name'],
                'joinDate' => $profile['join_date'],
                'bio' => $profile['bio']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
    }
    
    $stmt->close();
    $conn->close();
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized'
    ]);
}
?>