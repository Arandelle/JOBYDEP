<?php 
session_start();
header('Content-Type: application/json');

require_once 'database_ojt.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Only POST method is allowed'
    ]);
    exit;
}

$conn = getDbConnection();

// Get post data 
$data = json_decode(file_get_contents("php://input"), true);
$email = isset($data['email']) ? trim($data['email']) : "";
$username = isset($data['username']) ? trim($data['username']) : "";
$password = isset($data['password']) ? $data['password'] : "";
$fullName = isset($data['fullName']) ? trim($data['fullName']) : "";
$bio = isset($data['bio']) ? trim($data['bio']) : "";

// Validate input
if(empty($email) || empty($username) || empty($password) || empty($fullName)) {
    echo json_encode([
        'success' => false,
        'message' => 'Email, username, password and full name are required'
    ]);
    exit;
}

// Verify email exists and is verified
$stmt = $conn->prepare("SELECT id, is_verified FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Email not found'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

if(!$user['is_verified']) {
    echo json_encode([
        'success' => false,
        'message' => 'Email not verified. Please verify your email first.'
    ]);
    $conn->close();
    exit;
}

// Check if username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
$stmt->bind_param("si", $username, $user['id']);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows > 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Username already exists'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Update user profile
$stmt = $conn->prepare("UPDATE users SET username = ?, password = ?, full_name = ?, bio = ? WHERE id = ?");
$stmt->bind_param("ssssi", $username, $hashedPassword, $fullName, $bio, $user['id']);

if($stmt->execute()) {
    // Clear session verified email
    unset($_SESSION['verified_email']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile completed successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Profile update failed: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>