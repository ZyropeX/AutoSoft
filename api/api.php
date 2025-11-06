<?php
// ============================================================
// API Endpoint Principal - api.php
// ============================================================

// --- Configuración Inicial ---
date_default_timezone_set('America/Mexico_City');
header("Content-Type: application/json; charset=utf-8");

// --- Headers CORS ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// --- Manejo de Solicitud OPTIONS (Pre-flight) ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// --- Inclusión de Dependencias ---
require_once "config.php"; // Carga la conexión a la base de datos ($conn)

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Envía una respuesta JSON estandarizada y termina la ejecución.
 */
function sendJsonResponse($status, $message = null, $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    $response = ['status' => $status];
    if ($message !== null) $response['message'] = $message;
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); // Mejor formato para depuración
    exit;
}

// ============================================================
// VERIFICACIÓN DE CONEXIÓN DB (Hacerla temprano)
// ============================================================
if (!isset($conn) || $conn->connect_error) {
    // Usar sendJsonResponse para error de conexión también
    sendJsonResponse('error', 'Error de conexión a la base de datos: ' . ($conn->connect_error ?? 'No disponible'), null, 500);
}

// ============================================================
// DEFINICIONES DE FUNCIONES LÓGICAS
// ============================================================

// --- Funciones Genéricas ---

function getItems($conn, $tableName, $columns) {
    $cols = implode(', ', array_map(function($c) { return "`$c`"; }, $columns));
    $sql = "SELECT $cols FROM `$tableName`";
    $result = $conn->query($sql);
    if ($result === false) {
        sendJsonResponse('error', "Error al obtener $tableName: " . $conn->error, null, 500);
    }
    $items = $result->fetch_all(MYSQLI_ASSOC);
    sendJsonResponse('success', null, $items);
}

function createSimpleItem($conn, $data, $tableName, $columnName) {
    $nombre = trim($data['nombre'] ?? '');
    if (empty($nombre)) { sendJsonResponse('error', "El nombre no puede estar vacío.", null, 400); }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u', $nombre)) { sendJsonResponse('error', "Nombre inválido.", null, 400); }

    $sql = "INSERT INTO `$tableName` (`$columnName`) VALUES (?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB Prepare: " . $conn->error, null, 500); }
    $stmt->bind_param("s", $nombre);
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        $idColMap = ['vendedor' => 'id_vendedor', 'repartidor' => 'id_repartidor', 'metodo_pago' => 'id_metodo_pago'];
        $idCol = $idColMap[$tableName] ?? 'id';
        sendJsonResponse('success', ucfirst(str_replace('_', ' ', $tableName)) . " agregado", [$idCol => $id, "nombre" => $nombre], 201);
    } else {
        if ($conn->errno == 1062) { sendJsonResponse('error', "Error: '$nombre' ya existe.", null, 409); }
        else { sendJsonResponse('error', "Error al guardar: " . $stmt->error, null, 500); }
    }
    $stmt->close();
}

function deleteItem($conn, $data, $tableName, $idColumnName) {
    $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    if (!$id || $id <= 0) { sendJsonResponse('error', "ID inválido", null, 400); }
    $sql = "DELETE FROM `$tableName` WHERE `$idColumnName` = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB Prepare: " . $conn->error, null, 500); }
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', ucfirst(str_replace('_', ' ', $tableName)) . " eliminado"); }
        else { sendJsonResponse('error', ucfirst(str_replace('_', ' ', $tableName)) . " no encontrado", null, 404); }
    } else { sendJsonResponse('error', "Error al eliminar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Autenticación ---
function login($conn, $data) {
    $user = trim($data['usuario_login'] ?? '');
    $pass = $data['contraseña'] ?? '';
    if (empty($user) || empty($pass)) { sendJsonResponse('error', "Usuario/Contraseña requeridos", null, 400); }

    $sql = "SELECT id_empleado, nombre, rol, contraseña FROM empleado WHERE usuario_login = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("s", $user);
    if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); }
    $result = $stmt->get_result();
    if ($result->num_rows === 1) {
        $empleado = $result->fetch_assoc();
        if (password_verify($pass, $empleado['contraseña'])) {
            unset($empleado['contraseña']); sendJsonResponse('success', "Login exitoso", $empleado);
        } else { sendJsonResponse('error', "Contraseña incorrecta", null, 401); }
    } else { sendJsonResponse('error', "Usuario no encontrado", null, 404); }
    $stmt->close();
}

// --- Vendedores ---
function getVendedorById($conn, $id) {
    if (!$id || $id <= 0) { sendJsonResponse('error', "ID vendedor inválido", null, 400); }
    $sql = "SELECT id_vendedor, nombre FROM vendedor WHERE id_vendedor = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("i", $id);
    if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); }
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { sendJsonResponse('error', "Vendedor no encontrado", null, 404); }
    else { sendJsonResponse('success', null, $result->fetch_assoc()); }
    $stmt->close();
}

function updateVendedor($conn, $data) {
    $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    $nombre = trim($data['nombre'] ?? '');
    if (!$id || $id <= 0 || empty($nombre)) { sendJsonResponse('error', "ID y nombre requeridos", null, 400); }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u', $nombre)) { sendJsonResponse('error', "Nombre inválido", null, 400); }
    $sql = "UPDATE vendedor SET nombre = ? WHERE id_vendedor = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("si", $nombre, $id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', "Vendedor actualizado", ["id_vendedor" => $id, "nombre" => $nombre]); }
        else { $checkStmt = $conn->prepare("SELECT 1 FROM vendedor WHERE id_vendedor = ?"); $checkStmt->bind_param("i", $id); $checkStmt->execute();
             if ($checkStmt->get_result()->num_rows === 0) { sendJsonResponse('error', "Vendedor no encontrado", null, 404); }
             else { sendJsonResponse('success', "Vendedor no modificado", ["id_vendedor" => $id, "nombre" => $nombre]); } $checkStmt->close(); }
    } else { sendJsonResponse('error', "Error al actualizar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Repartidores ---
function getRepartidorById($conn, $id) {
     if (!$id || $id <= 0) { sendJsonResponse('error', "ID repartidor inválido", null, 400); }
    $sql = "SELECT id_repartidor, nombre FROM repartidor WHERE id_repartidor = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("i", $id);
    if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); }
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { sendJsonResponse('error', "Repartidor no encontrado", null, 404); }
    else { sendJsonResponse('success', null, $result->fetch_assoc()); }
    $stmt->close();
}

function updateRepartidor($conn, $data) {
     $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    $nombre = trim($data['nombre'] ?? '');
    if (!$id || $id <= 0 || empty($nombre)) { sendJsonResponse('error', "ID y nombre requeridos", null, 400); }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u', $nombre)) { sendJsonResponse('error', "Nombre inválido", null, 400); }
    $sql = "UPDATE repartidor SET nombre = ? WHERE id_repartidor = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("si", $nombre, $id);
     if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', "Repartidor actualizado", ["id_repartidor" => $id, "nombre" => $nombre]); }
        else { $checkStmt = $conn->prepare("SELECT 1 FROM repartidor WHERE id_repartidor = ?"); $checkStmt->bind_param("i", $id); $checkStmt->execute();
             if ($checkStmt->get_result()->num_rows === 0) { sendJsonResponse('error', "Repartidor no encontrado", null, 404); }
             else { sendJsonResponse('success', "Repartidor no modificado", ["id_repartidor" => $id, "nombre" => $nombre]); } $checkStmt->close(); }
    } else { sendJsonResponse('error', "Error al actualizar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Destinos ---
function createDestino($conn, $data) {
    $lugar = trim($data['lugar'] ?? '');
    $direccion = trim($data['direccion'] ?? '');
    if (empty($lugar) || empty($direccion)) { sendJsonResponse('error', "Lugar y dirección requeridos", null, 400); }
    $sql = "INSERT INTO destino (lugar, direccion) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("ss", $lugar, $direccion);
    if ($stmt->execute()) { $id = $conn->insert_id; sendJsonResponse('success', "Destino agregado", ["id_destino" => $id, "lugar" => $lugar, "direccion" => $direccion], 201); }
    else { sendJsonResponse('error', "Error al guardar: " . $stmt->error, null, 500); }
    $stmt->close();
}

function getDestinoById($conn, $id) {
    if (!$id || $id <= 0) { sendJsonResponse('error', "ID destino inválido", null, 400); }
    $sql = "SELECT id_destino, lugar, direccion FROM destino WHERE id_destino = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("i", $id);
     if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); }
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { sendJsonResponse('error', "Destino no encontrado", null, 404); }
    else { sendJsonResponse('success', null, $result->fetch_assoc()); }
    $stmt->close();
}

function updateDestino($conn, $data) {
    $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    $lugar = trim($data['lugar'] ?? '');
    $direccion = trim($data['direccion'] ?? '');
    if (!$id || $id <= 0 || empty($lugar) || empty($direccion)) { sendJsonResponse('error', "ID, lugar y dirección requeridos", null, 400); }
    $sql = "UPDATE destino SET lugar = ?, direccion = ? WHERE id_destino = ?";
    $stmt = $conn->prepare($sql);
     if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("ssi", $lugar, $direccion, $id);
     if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', "Destino actualizado", ["id_destino" => $id, "lugar" => $lugar, "direccion" => $direccion]); }
        else { $checkStmt = $conn->prepare("SELECT 1 FROM destino WHERE id_destino = ?"); $checkStmt->bind_param("i", $id); $checkStmt->execute();
             if ($checkStmt->get_result()->num_rows === 0) { sendJsonResponse('error', "Destino no encontrado", null, 404); }
             else { sendJsonResponse('success', "Destino no modificado", ["id_destino" => $id, "lugar" => $lugar, "direccion" => $direccion]); } $checkStmt->close(); }
    } else { sendJsonResponse('error', "Error al actualizar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Métodos de Pago ---
function getMetodoById($conn, $id) {
    if (!$id || $id <= 0) { sendJsonResponse('error', "ID método inválido", null, 400); }
    $sql = "SELECT id_metodo_pago, nombre, COALESCE(activo, 1) as activo FROM metodo_pago WHERE id_metodo_pago = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("i", $id);
    if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); }
    $result = $stmt->get_result();
    if ($result->num_rows === 0) { sendJsonResponse('error', "Método no encontrado", null, 404); }
    else { sendJsonResponse('success', null, $result->fetch_assoc()); }
    $stmt->close();
}

function updateMetodoPago($conn, $data) {
    $id = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    $nombre = trim($data['nombre'] ?? '');
    if (!$id || $id <= 0 || empty($nombre)) { sendJsonResponse('error', "ID y nombre requeridos", null, 400); }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u', $nombre)) { sendJsonResponse('error', "Nombre inválido", null, 400); }
    $sql = "UPDATE metodo_pago SET nombre = ? WHERE id_metodo_pago = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("si", $nombre, $id);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', "Método actualizado", ["id_metodo_pago" => $id, "nombre" => $nombre]); }
        else { $checkStmt = $conn->prepare("SELECT 1 FROM metodo_pago WHERE id_metodo_pago = ?"); $checkStmt->bind_param("i", $id); $checkStmt->execute();
             if ($checkStmt->get_result()->num_rows === 0) { sendJsonResponse('error', "Método no encontrado", null, 404); }
             else { sendJsonResponse('success', "Método no modificado", ["id_metodo_pago" => $id, "nombre" => $nombre]); } $checkStmt->close(); }
    } else { sendJsonResponse('error', "Error al actualizar: " . $stmt->error, null, 500); }
    $stmt->close();
}

function updateMetodoStatus($conn, $data) {
    
    $id = trim($data['id'] ?? '0');
    if (empty($id) || $id === '0') { 
        sendJsonResponse('error', "ID requerido", null, 400); 
    }
    // --- CAMBIO 2: Nueva lógica de validación para 'activo' ---
    if (!isset($data['activo'])) {
        // El key 'activo' no vino
        sendJsonResponse('error', "Estado (0 o 1) requerido", null, 400);
    }
    // Convertir a entero. '1' -> 1, '0' -> 0, 1 -> 1, 0 -> 0.
    $activo = (int)$data['activo'];
    // Validar que el resultado sea 0 o 1
    if ($activo !== 0 && $activo !== 1) {
        // Vino algo inválido como "abc"
        sendJsonResponse('error', "Estado debe ser 0 o 1", null, 400);
    }
    // --- FIN DE CAMBIOS DE VALIDACIÓN ---
    
    $sql = "UPDATE metodo_pago SET activo = ? WHERE id_metodo_pago = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    
    // Usar "is" (integer para $activo, string para $id)
    $stmt->bind_param("is", $activo, $id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { 
            sendJsonResponse('success', "Estado actualizado", ["id_metodo_pago" => $id, "activo" => $activo]); 
        } else { 
            // La lógica de 'else' (para cuando no hay cambios) ya está correcta
            $checkStmt = $conn->prepare("SELECT COALESCE(activo, 0) as activo FROM metodo_pago WHERE id_metodo_pago = ?"); 
            $checkStmt->bind_param("s", $id); 
            $checkStmt->execute(); 
            $result = $checkStmt->get_result();
            if ($result->num_rows === 0) { sendJsonResponse('error', "Método no encontrado", null, 404); }
            else { 
                $current = $result->fetch_assoc(); 
                $currentActivo = $current['activo']; 
                sendJsonResponse('success', "Estado no modificado (ya era ".$currentActivo.")", ["id_metodo_pago" => $id, "activo" => $currentActivo]); 
            } 
            $checkStmt->close(); 
        }
    } else { 
        sendJsonResponse('error', "Error al actualizar estado: " . $stmt->error, null, 500); 
    }
    $stmt->close();
}

// --- Asistencia ---
function getAsistenciaDelDia($conn) {
    $fecha = date('Y-m-d'); $listaFinal = [];
    try {
        $sqlRepartidores = "SELECT id_repartidor, nombre FROM repartidor";
        $repartidoresResult = $conn->query($sqlRepartidores);
        if ($repartidoresResult === false) { throw new Exception("Error R: ".$conn->error); }
        $todosLosRepartidores = $repartidoresResult->fetch_all(MYSQLI_ASSOC);
        $sqlAsistencias = "SELECT id_repartidor, hora_entrada, hora_salida, estado, observacion FROM asistencia WHERE fecha = ?";
        $stmt = $conn->prepare($sqlAsistencias);
        if (!$stmt) { throw new Exception("Error A Prep: ".$conn->error); }
        $stmt->bind_param("s", $fecha); $stmt->execute(); $asistenciasResult = $stmt->get_result();
        $asistenciasDeHoy = []; while ($row = $asistenciasResult->fetch_assoc()) { $asistenciasDeHoy[$row['id_repartidor']] = $row; } $stmt->close();
        foreach ($todosLosRepartidores as $repartidor) {
            $id = $repartidor['id_repartidor'];
            if (isset($asistenciasDeHoy[$id])) {
                $a = $asistenciasDeHoy[$id]; $listaFinal[] = ["id"=>$id,"name"=>$repartidor['nombre'],"entryTime"=>$a['hora_entrada'],"exitTime"=>$a['hora_salida'],"status"=>$a['estado'],"observation"=>$a['observacion'] ?? ''];
            } else { $listaFinal[] = ["id"=>$id,"name"=>$repartidor['nombre'],"entryTime"=>null,"exitTime"=>null,"status"=>"Ausente","observation"=>""]; }
        } sendJsonResponse('success', null, $listaFinal);
    } catch (Exception $e) { sendJsonResponse('error', $e->getMessage(), null, 500); }
}

function updateAsistencia($conn, $data) {
    $id_repartidor = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    $fecha = date('Y-m-d');
    $hora_entrada = ($data['entryTime'] === '--:--' || empty($data['entryTime'])) ? null : $data['entryTime'];
    $hora_salida = ($data['exitTime'] === '--:--' || empty($data['exitTime'])) ? null : $data['exitTime'];
    $estado = trim($data['status'] ?? 'Ausente'); $observacion = trim($data['observation'] ?? '');
    if (!$id_repartidor || $id_repartidor <= 0) { sendJsonResponse('error', "ID repartidor inválido", null, 400); }
    $sql = "INSERT INTO asistencia (id_repartidor, fecha, hora_entrada, hora_salida, estado, observacion) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE hora_entrada = VALUES(hora_entrada), hora_salida = VALUES(hora_salida), estado = VALUES(estado), observacion = VALUES(observacion)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB: " . $conn->error, null, 500); }
    $stmt->bind_param("isssss", $id_repartidor, $fecha, $hora_entrada, $hora_salida, $estado, $observacion);
    if ($stmt->execute()) { sendJsonResponse('success', "Asistencia actualizada"); }
    else { sendJsonResponse('error', "Error al guardar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Repartos (Bitácora) ---
function getRepartos($conn) {
    try {
        $sql = "SELECT r.id_reparto, r.ticket, d.lugar AS destino, rep.nombre AS repartidor, ven.nombre AS vendedor,
                       r.fecha_creacion, r.hora_salida, r.hora_llegada, r.monto_total, r.estado
                FROM reparto r
                LEFT JOIN destino d ON r.id_destino = d.id_destino
                LEFT JOIN repartidor rep ON r.id_repartidor = rep.id_repartidor
                LEFT JOIN vendedor ven ON r.id_vendedor = ven.id_vendedor
                ORDER BY r.fecha_creacion DESC, r.hora_salida DESC";
        $result = $conn->query($sql);
        if ($result === false) { throw new Exception("Error: ".$conn->error); }
        $items = $result->fetch_all(MYSQLI_ASSOC);
        foreach ($items as $key => $item) { $items[$key]['monto_total'] = (float)($item['monto_total'] ?? 0.0); }
        sendJsonResponse('success', null, $items);
    } catch (Exception $e) { sendJsonResponse('error', $e->getMessage(), null, 500); }
}

function createReparto($conn, $data) {
    $ticket = trim($data['ticket'] ?? ''); $id_destino = filter_var($data['id_destino'] ?? null, FILTER_VALIDATE_INT);
    $id_repartidor = filter_var($data['id_repartidor'] ?? null, FILTER_VALIDATE_INT); $id_vendedor = filter_var($data['id_vendedor'] ?? null, FILTER_VALIDATE_INT);
    $monto_total = filter_var($data['monto_total'] ?? null, FILTER_VALIDATE_FLOAT); $id_metodo_pago = filter_var($data['id_metodo_pago'] ?? null, FILTER_VALIDATE_INT);
    if (empty($ticket)) { sendJsonResponse('error', "Ticket requerido.", null, 400); } if (empty($id_destino)) { sendJsonResponse('error', "Destino requerido.", null, 400); }
    if (empty($id_repartidor)) { sendJsonResponse('error', "Repartidor requerido.", null, 400); } if (empty($id_vendedor)) { sendJsonResponse('error', "Vendedor requerido.", null, 400); }
    if (empty($id_metodo_pago)) { sendJsonResponse('error', "Método pago requerido.", null, 400); } if ($monto_total === null || $monto_total === false || $monto_total < 0) { sendJsonResponse('error', "Monto inválido.", null, 400); }
    $hora_salida = date('H:i:s'); $fecha_creacion = date('Y-m-d'); $estado = 'en curso';
    $sql = "INSERT INTO reparto (ticket, id_destino, id_repartidor, id_vendedor, id_metodo_pago, fecha_creacion, hora_salida, monto_total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB: " . $conn->error, null, 500); }
    $stmt->bind_param("siiiissss", $ticket, $id_destino, $id_repartidor, $id_vendedor, $id_metodo_pago, $fecha_creacion, $hora_salida, $monto_total, $estado);
    if ($stmt->execute()) { $newId = $conn->insert_id; sendJsonResponse('success', "Reparto agregado", ["id_reparto" => $newId], 201); }
    else { if ($conn->errno == 1062) { sendJsonResponse('error', "Ticket '$ticket' ya existe.", null, 409); } else { sendJsonResponse('error', "Error al guardar: " . $stmt->error, null, 500); } }
    $stmt->close();
}

function finalizarReparto($conn, $data) {
    $id_reparto = filter_var($data['id'] ?? 0, FILTER_VALIDATE_INT);
    if (!$id_reparto || $id_reparto <= 0) { sendJsonResponse('error', "ID reparto inválido", null, 400); }
    $hora_llegada = date('H:i:s'); $estado = 'finalizado';
    $sql = "UPDATE reparto SET estado = ?, hora_llegada = ? WHERE id_reparto = ? AND estado = 'en curso'";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB: " . $conn->error, null, 500); }
    $stmt->bind_param("ssi", $estado, $hora_llegada, $id_reparto);
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) { sendJsonResponse('success', "Reparto finalizado"); }
        else { $checkStmt = $conn->prepare("SELECT estado FROM reparto WHERE id_reparto = ?"); $checkStmt->bind_param("i", $id_reparto); $checkStmt->execute(); $result = $checkStmt->get_result();
             if ($result->num_rows === 0) { sendJsonResponse('error', "Reparto no encontrado.", null, 404); }
             else { $current = $result->fetch_assoc(); sendJsonResponse('error', "Reparto ya estaba: " . $current['estado'], null, 409); } $checkStmt->close(); }
    } else { sendJsonResponse('error', "Error al finalizar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Configuración ---
function getConfiguracion($conn) {
    $sql = "SELECT sueldo_base, tarifa_viaje, costo_falta FROM configuracion WHERE id = 1";
    $result = $conn->query($sql);
    if ($result && $result->num_rows > 0) {
        $config = $result->fetch_assoc();
        $formatted = ["sueldoBase"=>$config['sueldo_base']??0.0,"tarifaViaje"=>$config['tarifa_viaje']??0.0,"costoFalta"=>$config['costo_falta']??0.0];
        sendJsonResponse('success', null, $formatted);
    } else { sendJsonResponse('success', 'Usando defaults.', ["sueldoBase"=>0.0,"tarifaViaje"=>0.0,"costoFalta"=>0.0]); }
}

function saveConfiguracion($conn, $data) {
    $sb = filter_var($data['sueldoBase']??0.0, FILTER_VALIDATE_FLOAT); $tv = filter_var($data['tarifaViaje']??0.0, FILTER_VALIDATE_FLOAT); $cf = filter_var($data['costoFalta']??0.0, FILTER_VALIDATE_FLOAT);
    if ($sb === false || $sb < 0 || $tv === false || $tv < 0 || $cf === false || $cf < 0) { sendJsonResponse('error', "Valores deben ser números >= 0.", null, 400); }
    $sql = "INSERT INTO configuracion (id, sueldo_base, tarifa_viaje, costo_falta) VALUES (1, ?, ?, ?) ON DUPLICATE KEY UPDATE sueldo_base = VALUES(sueldo_base), tarifa_viaje = VALUES(tarifa_viaje), costo_falta = VALUES(costo_falta)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) { sendJsonResponse('error', "Error DB: " . $conn->error, null, 500); }
    $stmt->bind_param("ddd", $sb, $tv, $cf);
    if ($stmt->execute()) { sendJsonResponse('success', "Configuración guardada"); }
    else { sendJsonResponse('error', "Error al guardar: " . $stmt->error, null, 500); }
    $stmt->close();
}

// --- Pagos y Reportes ---
function calcularPagos($conn, $data) {
    $fechaInicio = $data['fechaInicio'] ?? null;
    $fechaFin = $data['fechaFin'] ?? null;
    $config = $data['configuracion'] ?? null;

    if (!$fechaInicio || !$fechaFin || !$config ||
        !($d1 = DateTime::createFromFormat('Y-m-d', $fechaInicio)) || $d1->format('Y-m-d') !== $fechaInicio ||
        !($d2 = DateTime::createFromFormat('Y-m-d', $fechaFin)) || $d2->format('Y-m-d') !== $fechaFin) {
        sendJsonResponse('error', "Fechas de inicio y fin inválidas (formato YYYY-MM-DD).", null, 400);
        return;
    }
    if ($d1 > $d2) {
         sendJsonResponse('error', "La fecha de inicio no puede ser posterior a la fecha fin.", null, 400);
         return;
    }
    if (!isset($config['sueldoBase']) || !isset($config['tarifaViaje']) || !isset($config['costoFalta'])) {
        sendJsonResponse('error', "Datos de configuración incompletos.", null, 400);
        return;
    }

    $reporteCalculado = [];
    try {
        $sqlRepartidores = "SELECT id_repartidor, nombre FROM repartidor";
        $repartidoresResult = $conn->query($sqlRepartidores);
        if ($repartidoresResult === false) {
            throw new Exception("Error al obtener repartidores: " . $conn->error);
        }
        $todosLosRepartidores = $repartidoresResult->fetch_all(MYSQLI_ASSOC);
        if (empty($todosLosRepartidores)) {
             sendJsonResponse('success', "No hay repartidores registrados.", []);
             return;
        }

        $estadoFinalizado = 'finalizado';
        $columnaFechaReparto = 'fecha_creacion';

        $sqlViajes = "SELECT id_repartidor, COUNT(id_reparto) as total_viajes
                      FROM reparto
                      WHERE estado = ? AND $columnaFechaReparto BETWEEN ? AND ?
                      GROUP BY id_repartidor";
        $stmtViajes = $conn->prepare($sqlViajes);
        if (!$stmtViajes) {
            throw new Exception("Error al preparar consulta de viajes: " . $conn->error);
        }
        $stmtViajes->bind_param("sss", $estadoFinalizado, $fechaInicio, $fechaFin);
        $stmtViajes->execute();
        $viajesResult = $stmtViajes->get_result();
        $conteoViajes = [];
        while ($row = $viajesResult->fetch_assoc()) {
            $conteoViajes[$row['id_repartidor']] = (int)$row['total_viajes'];
        }
        $stmtViajes->close();

        $estadoAusente = 'Ausente';
        $columnaFechaAsistencia = 'fecha';

        $sqlFaltas = "SELECT id_repartidor, COUNT(id_asistencia) as total_faltas
                      FROM asistencia
                      WHERE estado = ? AND $columnaFechaAsistencia BETWEEN ? AND ?
                      GROUP BY id_repartidor";
        $stmtFaltas = $conn->prepare($sqlFaltas);
        if (!$stmtFaltas) {
            throw new Exception("Error al preparar consulta de faltas: " . $conn->error);
        }
        $stmtFaltas->bind_param("sss", $estadoAusente, $fechaInicio, $fechaFin);
        $stmtFaltas->execute();
        $faltasResult = $stmtFaltas->get_result();
        $conteoFaltas = [];
        while ($row = $faltasResult->fetch_assoc()) {
            $conteoFaltas[$row['id_repartidor']] = (int)$row['total_faltas'];
        }
        $stmtFaltas->close();

        $sueldoBase = (float)($config['sueldoBase'] ?? 0.0);
        $tarifaViaje = (float)($config['tarifaViaje'] ?? 0.0);
        $costoFalta = (float)($config['costoFalta'] ?? 0.0);

        foreach ($todosLosRepartidores as $repartidor) {
            $id = $repartidor['id_repartidor'];
            $viajesHechos = $conteoViajes[$id] ?? 0;
            $faltas = $conteoFaltas[$id] ?? 0;

            $sueldoPorViajes = $viajesHechos * $tarifaViaje;
            $totalBruto = $sueldoBase + $sueldoPorViajes;
            $descuentos = $faltas * $costoFalta;
            $totalNeto = $totalBruto - $descuentos;

            $reporteCalculado[] = [
                'repartidor'      => $repartidor['nombre'],
                'sueldoBase'      => $sueldoBase,
                'viajesHechos'    => $viajesHechos,
                'sueldoPorViajes' => $sueldoPorViajes,
                'totalBruto'      => $totalBruto,
                'descuentos'      => $descuentos,
                'totalNeto'       => $totalNeto
            ];
        }

        sendJsonResponse('success', "Cálculo completado", $reporteCalculado);

    } catch (Exception $e) {
        sendJsonResponse('error', "Error al calcular pagos: " . $e->getMessage(), null, 500);
    }
}

function saveReporte($conn, $data) {
    if (!empty($data['reporteCalculado']) && is_array($data['reporteCalculado'])) { sendJsonResponse('success', "Reporte recibido (simulado)"); }
    else { sendJsonResponse('error', "Datos inválidos", null, 400); }
}

// --- Huellas ---
function saveFingerprintData($conn, $data) {
    $tipo = trim($data['tipo_persona'] ?? ''); $idp = filter_var($data['id_persona'] ?? 0, FILTER_VALIDATE_INT); $dh = $data['datos_huella'] ?? '';
    if (empty($tipo) || !$idp || $idp <= 0 || empty($dh)) { sendJsonResponse('error', "Datos incompletos", null, 400); }
    if (!in_array($tipo, ['vendedor', 'repartidor'])) { sendJsonResponse('error', "Tipo inválido", null, 400); }
    $sql = "INSERT INTO huella (tipo_persona, id_persona, datos_huella, estado, fecha_registro) VALUES (?, ?, ?, 'activo', NOW())
            ON DUPLICATE KEY UPDATE datos_huella = VALUES(datos_huella), estado = 'activo', fecha_registro = NOW()";
    $stmt = $conn->prepare($sql); if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("sis", $tipo, $idp, $dh);
    if ($stmt->execute()) { $msg = ($stmt->affected_rows === 1) ? "Huella registrada" : "Huella actualizada"; sendJsonResponse('success', $msg, ["tipo_persona"=>$tipo,"id_persona"=>$idp]); }
    else { sendJsonResponse('error', "Error al guardar: ".$stmt->error, null, 500); } $stmt->close();
}

function verifyFingerprintData($conn, $data) {
    $tipo = trim($data['tipo_persona'] ?? ''); $dh = $data['datos_huella'] ?? '';
    if (empty($tipo) || empty($dh)) { sendJsonResponse('error', "Datos incompletos", null, 400); }
    if (!in_array($tipo, ['vendedor', 'repartidor'])) { sendJsonResponse('error', "Tipo inválido", null, 400); }
    $sql = "SELECT id_persona FROM huella WHERE tipo_persona = ? AND datos_huella = ? AND estado = 'activo' LIMIT 1";
    $stmt = $conn->prepare($sql); if (!$stmt) { sendJsonResponse('error', "Error DB", null, 500); }
    $stmt->bind_param("ss", $tipo, $dh);
    if(!$stmt->execute()){ sendJsonResponse('error', "Error DB", null, 500); } $result = $stmt->get_result();
    if ($result->num_rows > 0) { $h = $result->fetch_assoc(); sendJsonResponse('success', "Huella verificada", ["id_persona"=>$h['id_persona'],"tipo_persona"=>$tipo]); }
    else { sendJsonResponse('error', "Huella no reconocida", null, 404); } $stmt->close();
}

// ============================================================
// NUEVAS FUNCIONES PARA DASHBOARD (REPORTES)
// ============================================================
// Agregar ANTES del switch principal, junto a las otras funciones

/**
 * Obtiene estadísticas de repartos y ganancias por repartidor en un mes específico
 * Calcula: repartos, ganancia neta (solo tarifa de viaje)
 */
function getEstadisticasRepartidores($conn, $data) {
    $mes = filter_var($data['mes'] ?? date('m'), FILTER_VALIDATE_INT);
    $año = filter_var($data['año'] ?? date('Y'), FILTER_VALIDATE_INT);
    
    if (!$mes || $mes < 1 || $mes > 12 || !$año || $año < 2020) {
        sendJsonResponse('error', "Mes (1-12) y año (>=2020) requeridos", null, 400);
    }

    // Obtener tarifa de viaje desde configuración
    $sqlConfig = "SELECT tarifa_viaje FROM configuracion WHERE id = 1";
    $resultConfig = $conn->query($sqlConfig);
    $tarifaViaje = 0;
    
    if ($resultConfig && $resultConfig->num_rows > 0) {
        $config = $resultConfig->fetch_assoc();
        $tarifaViaje = (float)($config['tarifa_viaje'] ?? 0);
    }

    try {
        // Obtener todos los repartidores
        $sqlRepartidores = "SELECT id_repartidor, nombre FROM repartidor ORDER BY nombre ASC";
        $repartidoresResult = $conn->query($sqlRepartidores);
        if ($repartidoresResult === false) {
            throw new Exception("Error al obtener repartidores: " . $conn->error);
        }
        $repartidores = $repartidoresResult->fetch_all(MYSQLI_ASSOC);

        $estadisticas = [];

        foreach ($repartidores as $rep) {
            $idRepartidor = $rep['id_repartidor'];
            $nombre = $rep['nombre'];

            // Contar repartos finalizados en el mes
            $sqlRepartos = "SELECT COUNT(id_reparto) as total_repartos, 
                                  COALESCE(SUM(monto_total), 0) as total_empresa
                           FROM reparto
                           WHERE id_repartidor = ?
                           AND estado = 'finalizado'
                           AND YEAR(fecha_creacion) = ?
                           AND MONTH(fecha_creacion) = ?";
            
            $stmtRepartos = $conn->prepare($sqlRepartos);
            if (!$stmtRepartos) {
                throw new Exception("Error al preparar consulta: " . $conn->error);
            }

            $stmtRepartos->bind_param("iii", $idRepartidor, $año, $mes);
            $stmtRepartos->execute();
            $resultRepartos = $stmtRepartos->get_result();
            $rowRepartos = $resultRepartos->fetch_assoc();

            $totalRepartos = (int)($rowRepartos['total_repartos'] ?? 0);
            $totalEmpresa = (float)($rowRepartos['total_empresa'] ?? 0);

            // Calcular ganancia del repartidor (solo tarifa por viaje)
            $gananciaRepartidor = $totalRepartos * $tarifaViaje;

            $estadisticas[] = [
                'id_repartidor' => $idRepartidor,
                'nombre' => $nombre,
                'repartos' => $totalRepartos,
                'ganancia_empresa' => round($totalEmpresa, 2),
                'tarifa_viaje' => round($tarifaViaje, 2),
                'ganancia_repartidor' => round($gananciaRepartidor, 2)
            ];

            $stmtRepartos->close();
        }

        // Ordenar por ganancia del repartidor (de mayor a menor)
        usort($estadisticas, function($a, $b) {
            return $b['ganancia_repartidor'] <=> $a['ganancia_repartidor'];
        });

        sendJsonResponse('success', "Estadísticas obtenidas", $estadisticas);

    } catch (Exception $e) {
        sendJsonResponse('error', "Error al obtener estadísticas: " . $e->getMessage(), null, 500);
    }
}

/**
 * Obtiene estadísticas comparativas entre dos meses
 */
function getComparativasMeses($conn, $data) {
    $mesActual = filter_var($data['mes_actual'] ?? date('m'), FILTER_VALIDATE_INT);
    $añoActual = filter_var($data['año_actual'] ?? date('Y'), FILTER_VALIDATE_INT);
    
    if (!$mesActual || $mesActual < 1 || $mesActual > 12 || !$añoActual || $añoActual < 2020) {
        sendJsonResponse('error', "Parámetros inválidos", null, 400);
    }

    // Calcular mes anterior
    $mesAnterior = $mesActual - 1;
    $añoAnterior = $añoActual;
    if ($mesAnterior < 1) {
        $mesAnterior = 12;
        $añoAnterior = $añoActual - 1;
    }

    // Obtener tarifa
    $sqlConfig = "SELECT tarifa_viaje FROM configuracion WHERE id = 1";
    $resultConfig = $conn->query($sqlConfig);
    $tarifaViaje = 0;
    
    if ($resultConfig && $resultConfig->num_rows > 0) {
        $config = $resultConfig->fetch_assoc();
        $tarifaViaje = (float)($config['tarifa_viaje'] ?? 0);
    }

    try {
        // Función auxiliar para obtener totales de un mes
        $obtenerTotalesMes = function($mes, $año) use ($conn, $tarifaViaje) {
            $sql = "SELECT 
                    COUNT(DISTINCT id_repartidor) as total_repartidores,
                    COUNT(id_reparto) as total_repartos,
                    COALESCE(SUM(monto_total), 0) as total_empresa
                   FROM reparto
                   WHERE estado = 'finalizado'
                   AND YEAR(fecha_creacion) = ?
                   AND MONTH(fecha_creacion) = ?";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("Error al preparar consulta: " . $conn->error);
            }

            $stmt->bind_param("ii", $año, $mes);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();

            $totalRepartos = (int)($row['total_repartos'] ?? 0);
            $gananciaTotal = $totalRepartos * $tarifaViaje;

            return [
                'repartidores' => (int)($row['total_repartidores'] ?? 0),
                'repartos' => $totalRepartos,
                'ganancia_empresa' => round((float)($row['total_empresa'] ?? 0), 2),
                'ganancia_repartidores' => round($gananciaTotal, 2)
            ];
        };

        $totalesActual = $obtenerTotalesMes($mesActual, $añoActual);
        $totalesAnterior = $obtenerTotalesMes($mesAnterior, $añoAnterior);

        // Calcular diferencias (%)
        $diffRepartos = $totalesAnterior['repartos'] > 0 
            ? round((($totalesActual['repartos'] - $totalesAnterior['repartos']) / $totalesAnterior['repartos']) * 100, 2)
            : 0;

        $diffGanancia = $totalesAnterior['ganancia_repartidores'] > 0
            ? round((($totalesActual['ganancia_repartidores'] - $totalesAnterior['ganancia_repartidores']) / $totalesAnterior['ganancia_repartidores']) * 100, 2)
            : 0;

        $comparativa = [
            'mes_actual' => $mesActual,
            'año_actual' => $añoActual,
            'mes_anterior' => $mesAnterior,
            'año_anterior' => $añoAnterior,
            'totales_actual' => $totalesActual,
            'totales_anterior' => $totalesAnterior,
            'diferencias' => [
                'repartos_pct' => $diffRepartos,
                'ganancia_pct' => $diffGanancia
            ]
        ];

        sendJsonResponse('success', "Comparativa obtenida", $comparativa);

    } catch (Exception $e) {
        sendJsonResponse('error', "Error al obtener comparativa: " . $e->getMessage(), null, 500);
    }
}


// ============================================================
// PROCESAMIENTO Y ENRUTAMIENTO (SWITCH)
// ============================================================

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$inputData = json_decode(file_get_contents("php://input"), true);
$data = array_replace($_POST ?: [], (array)$inputData, $_GET);

// --- Switch principal ---
switch ($action) {
    // Autenticación
    case 'login':                       login($conn, $data); break;

    // Vendedores
    case 'get_vendedores':              getItems($conn, 'vendedor', ['id_vendedor', 'nombre']); break;
    case 'create_vendedor':             createSimpleItem($conn, $data, 'vendedor', 'nombre'); break;
    case 'get_vendedor_by_id':          getVendedorById($conn, $data['id'] ?? 0); break;
    case 'update_vendedor':             updateVendedor($conn, $data); break;
    case 'delete_vendedor':             deleteItem($conn, $data, 'vendedor', 'id_vendedor'); break;

    // Repartidores
    case 'get_repartidores':            getItems($conn, 'repartidor', ['id_repartidor', 'nombre']); break;
    case 'create_repartidor':           createSimpleItem($conn, $data, 'repartidor', 'nombre'); break;
    case 'get_repartidor_by_id':        getRepartidorById($conn, $data['id'] ?? 0); break;
    case 'update_repartidor':           updateRepartidor($conn, $data); break;
    case 'delete_repartidor':           deleteItem($conn, $data, 'repartidor', 'id_repartidor'); break;

    // Destinos
    case 'get_destinos':                getItems($conn, 'destino', ['id_destino', 'lugar', 'direccion']); break;
    case 'create_destino':              createDestino($conn, $data); break;
    case 'get_destino_by_id':           getDestinoById($conn, $data['id'] ?? 0); break;
    case 'update_destino':              updateDestino($conn, $data); break;
    case 'delete_destino':              deleteItem($conn, $data, 'destino', 'id_destino'); break;

    // Métodos de Pago
    case 'get_metodos_pago':
    
    $sql = "SELECT id_metodo_pago, nombre, COALESCE(activo, 0) as activo
            FROM metodo_pago
            ORDER BY nombre ASC";
    
    $result = $conn->query($sql);
    if ($result === false) {
        sendJsonResponse('error', "Error al obtener métodos de pago: " . $conn->error, null, 500);
    }
    $items = $result->fetch_all(MYSQLI_ASSOC);
    sendJsonResponse('success', null, $items);
    break;
    case 'create_metodo_pago':          createSimpleItem($conn, $data, 'metodo_pago', 'nombre'); break;
    case 'get_metodo_by_id':            getMetodoById($conn, $data['id'] ?? 0); break;
    case 'update_metodo_pago':          updateMetodoPago($conn, $data); break;
    case 'update_metodo_status':        updateMetodoStatus($conn, $data); break;
    case 'delete_metodo_pago':          deleteItem($conn, $data, 'metodo_pago', 'id_metodo_pago'); break;

    // Asistencia
    case 'get_asistencia_del_dia':      getAsistenciaDelDia($conn); break;
    case 'update_asistencia':           updateAsistencia($conn, $data); break;

    case 'get_estadisticas_repartidores':   getEstadisticasRepartidores($conn, $data); break;
    case 'get_comparativas_meses':          getComparativasMeses($conn, $data); break;

    // Repartos (Bitácora)
    case 'get_repartos':                getRepartos($conn); break;
    case 'create_reparto':              createReparto($conn, $data); break;
    case 'finalizar_reparto':           finalizarReparto($conn, $data); break;

    // Configuración
    case 'get_configuracion':           getConfiguracion($conn); break;
    case 'save_configuracion':          saveConfiguracion($conn, $data); break;

    // Pagos y Reportes
    case 'calcular_pagos':              calcularPagos($conn, $data); break;
    case 'save_reporte':                saveReporte($conn, $data); break;

    // Huellas Digitales
    case 'save_fingerprint':            saveFingerprintData($conn, $data); break;
    case 'verify_fingerprint':          verifyFingerprintData($conn, $data); break;

    // Acción por defecto (inválida)
    default:
        sendJsonResponse('error', "Acción no válida solicitada: '$action'", null, 400);
        break;
}

// ============================================================
// CIERRE DE CONEXIÓN
// ============================================================
if (isset($conn) && $conn instanceof mysqli) {
     $conn->close();
}