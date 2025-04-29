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

// Validate input
if(empty($email)) {
    echo json_encode([
        'success' => false,
        'message' => 'Email is required'
    ]);
    exit;
}

// Check if email exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
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

// Generate new OTP
$otp = rand(100000, 999999);
$otp_expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

// Update user with new OTP
$stmt = $conn->prepare("UPDATE users SET otp = ?, otp_expiry = ? WHERE id = ?");
$stmt->bind_param("ssi", $otp, $otp_expiry, $user['id']);

if($stmt->execute()) {
    // In a real application, you would send an email with the OTP
    // For now, we'll just return success and the OTP (for testing purposes)
    echo json_encode([
        'success' => true,
        'message' => 'New OTP sent successfully',
        'otp' => $otp // Remove this in production
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to resend OTP: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>