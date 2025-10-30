<?php
// config.php
$host = "localhost:3307"; 
$user = "root";
$pass = ""; 
$db   = "kungfu";
$conn = new mysqli($host, $user, $pass, $db);

// Verificar conexión
if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Error de conexión: " . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");
?>
