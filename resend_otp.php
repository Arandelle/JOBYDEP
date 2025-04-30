<?php
session_start();
header("Content-Type: application/json");

require_once 'database_ojt.php';

// only allow post request
if ($_SERVER['REQUEST_METHOD'] !== "POST") {
    echo json_encode([
        'success' => false,
        'message' => "Only POST method is allowed"
    ]);

    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$email = isset($data['email']) ? trim($data['email']) : "";

// Make sure we have email in the request
if (empty($email)) {
    echo json_encode([
        'success' => false,
        'message' => "Email is required"
    ]);
    exit;
}

if (!isset($_SESSION['pending_email']) || $_SESSION['pending_email'] !== $email ) {
    echo json_encode([
        'success' => false,
        'message' => "No pending verification for this email"
    ]);
    exit;
}

$new_otp = rand(100000, 999999);
$new_otp_expiry = time() + (3 * 60); // 3 minutes

$_SESSION['pending_otp'] = $new_otp;
$_SESSION['otp_expiry'] = $new_otp_expiry;

echo json_encode([
    "success" => true,
    'message' => "New OTP sent successfully",
    'test_otp' => $new_otp,
    'otp_expiry' => $new_otp_expiry
]);
