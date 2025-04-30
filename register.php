<?php
session_start(); // start session to manage user session data
header('Content-Type: application/json'); // set content type to JSON

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
// This reads raw data input from HTTP request body
$data = json_decode(file_get_contents("php://input"), true); // decodes the JSON
$email = isset($data['email']) ? trim($data['email']) : ""; // extract the email

// Validate input
if (empty($email)) {
    echo json_encode([
        'success' => false,
        'message' => 'email is require'
    ]);
    exit;
}

//validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'message' => "Invalid email format"
    ]);
    exit;
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND is_verified = 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows > 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Email already exists'
    ]);
    $stmt->close();
    $conn->close();
    exit;
}
// generates otp
$otp = rand(100000, 999999);
$otp_expiry = time() + 15; // 15 seconds

// store the data to session and not push to DB
$_SESSION['pending_email'] = $email;
$_SESSION['pending_otp'] = $otp;
$_SESSION['otp_expiry'] = $otp_expiry;

echo json_encode([
    'success' => true,
    'message' => 'OTP generated successfully',
    'test_otp' => $otp,
    'otp_expiry' => $otp_expiry
]);

$stmt->close();
$conn->close();

?>