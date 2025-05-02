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

// Validate input
if (empty($email) || empty($username) || empty($password)) {
    echo json_encode([
        'success' => false,
        'message' => 'Email, username, password and are required'
    ]);
    exit;
}

// Check if username already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows > 0) {
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

$insert = $conn->prepare("INSERT INTO users (email,username, password) VALUES (?,?,?)");
$insert->bind_param("sss", $email, $username, $hashedPassword);

if ($insert->execute()) {
    // Clear session verified email
    unset($_SESSION['verified_email']);

    echo json_encode([
        'success' => true,
        'message' => 'Profile completed successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update profile'
    ]);
}

$insert->close();
$conn->close();
