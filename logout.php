<?php 

    session_start();
    header('Content-Type: application/json');

    //clear session
    $_SESSION = [];
    session_destroy();

    echo json_encode([
        'success' => true
    ]);

?>