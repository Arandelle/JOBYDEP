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


//Get post data 
$data = json_decode(file_get_contents("php://input"), true);
$email = isset($data['email']) ? trim($data['email']) : "";

// Validate input
if(empty($email)) {
    echo json_encode([
        'success' => false,
        'message' => 'email is require'
    ]);
    exit;
}

//validate email format
if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
    echo json_encode([
        'success' => false,
        'message' => "Invalid email format"
    ]);
    exit;   
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if($result->num_rows > 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Email already exists'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

    $otp = rand(100000, 999999);
    $otp_expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

// Insert new user
$stmt = $conn->prepare("INSERT INTO users (email, otp, otp_expiry, is_verified) VALUES (?,?,?, 0)");
$stmt->bind_param("sss", $email, $otp, $otp_expiry);

if($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'otp' => $otp
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Registration failed: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>