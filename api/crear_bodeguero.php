<?php


require_once "config.php"; 

$nombre_admin    = "bodega"; 
$apellido_admin  = "Autosoft";
$usuario_login   = "bodega"; 
$contraseña_plana = "qwerty321"; 
$rol             = "bodega"; 
// -----------------------------

$contraseña_hasheada = password_hash($contraseña_plana, PASSWORD_BCRYPT);

$sql = "INSERT INTO empleado (nombre, apellido, usuario_login, contraseña, rol) VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $nombre_admin, $apellido_admin, $usuario_login, $contraseña_hasheada, $rol);


if ($stmt->execute()) {
    echo "<h1>¡Éxito!</h1>";
    echo "<p>El usuario administrador ha sido creado correctamente.</p>";
    echo "<p><strong>Usuario:</strong> " . htmlspecialchars($usuario_login) . "</p>";
    echo "<p><strong>Contraseña:</strong> " . htmlspecialchars($contraseña_plana) . "</p>";
    echo '<p><a href="../index.html">Ir a la página de Login</a></p>';
} else {
    echo "<h1>Error</h1>";
    echo "<p>No se pudo crear el usuario. Error: " . $stmt->error . "</p>";
    echo "<p>Es posible que el usuario ya exista en la base de datos.</p>";
}

$stmt->close();
$conn->close();

?>