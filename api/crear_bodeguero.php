<?php


require_once "config.php"; // Nos conectamos a la base de datos

// --- DEFINE AQUÍ TUS DATOS ---
$nombre_admin    = "Admin";
$apellido_admin  = "Autosoft";
$usuario_login   = "bodega";
$contraseña_plana = "qwerty321"; // <-- ¡Esta será tu contraseña!
$rol             = "admin";
// -----------------------------

// Encriptamos la contraseña de forma segura
$contraseña_hasheada = password_hash($contraseña_plana, PASSWORD_BCRYPT);

// Preparamos la consulta para insertar el nuevo empleado
$sql = "INSERT INTO empleado (nombre, apellido, usuario_login, contraseña, rol) VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $nombre_admin, $apellido_admin, $usuario_login, $contraseña_hasheada, $rol);

// Ejecutamos y mostramos un mensaje
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