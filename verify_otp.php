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
$otp = isset($data['otp']) ? trim($data['otp']) : "";

// Validate input
if(empty($email) || empty($otp)) {
    echo json_encode([
        'success' => false,
        'message' => 'Email and OTP are required'
    ]);
    exit;
}

// Check if email exists and OTP is valid
$stmt = $conn->prepare("SELECT id, otp, otp_expiry FROM users WHERE email = ?");
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

// Check if OTP matches and is not expired
$current_time = date('Y-m-d H:i:s');
if($user['otp'] !== $otp) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid OTP'
    ]);
    $conn->close();
    exit;
}

if($current_time > $user['otp_expiry']) {
    echo json_encode([
        'success' => false,
        'message' => 'OTP has expired. Please request a new one.'
    ]);
    $conn->close();
    exit;
}

// Mark user as verified
$stmt = $conn->prepare("UPDATE users SET is_verified = 1 WHERE id = ?");
$stmt->bind_param("i", $user['id']);

if($stmt->execute()) {
    // Store verified email in session for the next step
    $_SESSION['verified_email'] = $email;
    
    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Verification failed: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>