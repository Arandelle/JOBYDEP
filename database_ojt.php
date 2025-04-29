<?php 
    //database connecttion configuration
    define('DB_SERVER', 'localhost');
    define('DB_USERNAME', 'root');
    define('DB_PASSWORD', '');
    define('DB_NAME', 'ojt_db');

    // establish database connection
    function getDbConnection (){ 
        $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

        //check connection
        if($conn->connect_error){
            die("Connection failed" . $conn->connect_error);
        }

        return $conn;
    }
?>