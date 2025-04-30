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
$data = json_decode(file_get_contents("php://input"), true); // reads the raw data from AngularJS
$email = isset($data['email']) ? trim($data['email']) : "";
$otp = isset($data['otp']) ? trim($data['otp']) : ""; // extract otp - user input


if(empty($email) || empty($otp)){
    echo json_encode([
        'success' => false,
        'message' => "Email and OTP are required"
    ]);
    exit;
}

$_SESSION['pending_otp'] = $otp; // update it for resending new otp

// check if session has pending OTP data
if(!isset($_SESSION['pending_email']) && !isset($_SESSION['pending_otp']) && !isset($_SESSION['otp_expiry'])){
    echo json_encode([
        'success' => false,
        'message' => "No OTP found. Please try again!"
    ]);
    exit;
}

// Verify the email matches the pending email
if($email != $_SESSION['pending_email']){
    echo json_encode([
        'success' => false,
        'message' => "Email does not match the one used for OTP generation"
    ]);
    exit;
}

//Validate otp
if($otp != $_SESSION['pending_otp']){
    echo json_encode([
        'success' => false,
        'message' => "Incorrect OTP. Please try again"
    ]);
    exit;
}

// Validate input
if(empty($otp)) {
    echo json_encode([
        'success' => false,
        'message' => 'Email and OTP are required'
    ]);
    exit;
}



// Check if OTP matches and is not expired
$current_time = time();
if($_SESSION['otp_expiry'] < $current_time){
    echo json_encode([
        'success' => false,
        'message' => "OTP expired. Please request a new one"
    ]);
     exit;
}


$stmt = $conn->prepare("INSERT INTO users (email) VALUES (?)");
$stmt->bind_param('s', $email);

if($stmt->execute()){
    // clear the session after successful insert
    unset($_SESSION['pending_email']);
    unset($_SESSION['pending_otp']);
    unset($_SESSION['otp_expiry']);

    echo json_encode([
        'success' => true,
        'message' => "email verified successfully"
    ]);
} else{
    echo json_encode([
        'success' => false,
        'message' => "Verification failed" . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>