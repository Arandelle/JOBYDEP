<?php
// handle user login with MySQL authentication
session_start();
header('Content-Type: application/json');

// include database connecttion
include_once 'database_ojt.php';

// Get post data
$data = json_decode(file_get_contents('php://input'), true);
$username = isset($data['username']) ? $data['username'] : '';
$password = isset($data['password']) ? $data['password'] : '';

// validate input
if (empty($username) || empty($password)) {
    echo json_encode([
        'success' => false,
        'message' => 'Provide both username and password'
    ]);
    exit;
}

$conn = getDbConnection();

//prepare sql statement to prevent sql injection
$stmt = $conn->prepare("SELECT id, username, password,full_name,email FROM users WHERE username = ? AND is_active = 1");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 1) {
    $user = $result->fetch_assoc();

    //verify password
    if (password_verify($password, $user['password'])) {
        $token = bin2hex(random_bytes(32));

        $_SESSION['auth_token'] = $token;
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];

        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username']
            ]
            ]);
    } else{
        // Password is incorrect
        echo json_encode([
            'success' => false,
            'message' => 'Invalid username or password'
        ]);
    }
} else {
     // User not found
     echo json_encode([
        'success' => false,
        'message' => 'Invalid username or password'
    ]);
}

$stmt->close();
$conn->close();

?>