<?php
// =================================================================
// 1. CONFIGURACIÓN INICIAL Y ENCABEZADOS
// =================================================================
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once "config.php";


// =================================================================
// 2. ENRUTADOR PRINCIPAL (ROUTER)
// =================================================================
$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents("php://input"), true);

switch ($action) {
    // --- Autenticación ---
    case 'login':
        login($conn, $data);
        break;

    // --- Vendedores ---
    case 'get_vendedores':
        getItems($conn, 'vendedor', ['id_vendedor', 'nombre']);
        break;
    case 'create_vendedor':
        createSimpleItem($conn, $data, 'vendedor', 'nombre');
        break;
    case 'delete_vendedor':
        deleteItem($conn, $data, 'vendedor', 'id_vendedor');
        break;

    // --- Repartidores ---
    case 'get_repartidores':
        getItems($conn, 'repartidor', ['id_repartidor', 'nombre']);
        break;
    case 'create_repartidor':
        createSimpleItem($conn, $data, 'repartidor', 'nombre');
        break;
    case 'delete_repartidor':
        deleteItem($conn, $data, 'repartidor', 'id_repartidor');
        break;

    // --- Destinos ---
    case 'get_destinos':
        getItems($conn, 'destino', ['id_destino', 'lugar', 'direccion']);
        break;
    case 'create_destino':
        createDestino($conn, $data);
        break;
    case 'delete_destino':
        deleteItem($conn, $data, 'destino', 'id_destino');
        break;

    // --- Métodos de Pago ---
    case 'get_metodos_pago':
        getItems($conn, 'metodo_pago', ['id_metodo_pago', 'nombre']);
        break;
    case 'create_metodo_pago':
        createSimpleItem($conn, $data, 'metodo_pago', 'nombre');
        break;
    case 'delete_metodo_pago':
        deleteItem($conn, $data, 'metodo_pago', 'id_metodo_pago');
        break;

    // --- Asistencias ---
    case 'get_asistencia_del_dia':
        getAsistenciaDelDia($conn);
        break;
    case 'update_asistencia':
        updateAsistencia($conn, $data);
        break;
    
    // --- Repartos (Bitácora) ---
    case 'get_repartos':
        getRepartos($conn);
        break;
    case 'create_reparto':
        createReparto($conn, $data);
        break;
    case 'finalizar_reparto':
        finalizarReparto($conn, $data);
        break;

    // --- Pagos y Configuración ---
    case 'get_configuracion':
        getConfiguracion($conn);
        break;
    case 'save_configuracion':
        saveConfiguracion($conn, $data);
        break;
    case 'calcular_pagos':
        calcularPagos($conn, $data);
        break;
    case 'save_reporte':
        saveReporte($conn, $data);
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Acción no válida: $action"]);
        break;
}

$conn->close();

// =================================================================
// 3. DEFINICIÓN DE FUNCIONES
// =================================================================

// --- FUNCIONES GENÉRICAS ---
function getItems($conn, $tableName, $columns) {
    $cols = implode(', ', array_map(function($c) { return "`$c`"; }, $columns));
    $sql = "SELECT $cols FROM `$tableName`";
    $result = $conn->query($sql);
    $items = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode(["status" => "success", "data" => $items]);
}

function createSimpleItem($conn, $data, $tableName, $columnName) {
    $nombre = $data['nombre'] ?? '';
    if (empty($nombre)) {
        echo json_encode(["status" => "error", "message" => "El nombre no puede estar vacío."]);
        return;
    }
    $sql = "INSERT INTO `$tableName` (`$columnName`) VALUES (?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $nombre);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => ucfirst($tableName) . " agregado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    $stmt->close();
}

function deleteItem($conn, $data, $tableName, $idColumnName) {
    $id = $data['id'] ?? 0;
    if (empty($id)) {
        echo json_encode(["status" => "error", "message" => "ID no proporcionado"]);
        return;
    }
    $sql = "DELETE FROM `$tableName` WHERE `$idColumnName` = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => ucfirst($tableName) . " eliminado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al eliminar: " . $stmt->error]);
    }
    $stmt->close();
}

// --- FUNCIONES ESPECÍFICAS ---

function login($conn, $data) {
    $user = $data['usuario_login'] ?? '';
    $pass = $data['contraseña'] ?? '';
    $sql = "SELECT id_empleado, nombre, rol, contraseña FROM empleado WHERE usuario_login = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 1) {
        $empleado = $result->fetch_assoc();
        if (password_verify($pass, $empleado['contraseña'])) {
            unset($empleado['contraseña']);
            echo json_encode(["status" => "success", "data" => $empleado]);
        } else {
            echo json_encode(["status" => "error", "message" => "Contraseña incorrecta"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Usuario no encontrado"]);
    }
    $stmt->close();
}

function createDestino($conn, $data) {
    $lugar = $data['lugar'] ?? '';
    $direccion = $data['direccion'] ?? '';
    $sql = "INSERT INTO destino (lugar, direccion) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $lugar, $direccion);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Destino agregado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    $stmt->close();
}

// --- FUNCIONES DE ASISTENCIAS ---
function getAsistenciaDelDia($conn) {
    $fecha = date('Y-m-d');
    $sqlRepartidores = "SELECT id_repartidor, nombre FROM repartidor";
    $repartidoresResult = $conn->query($sqlRepartidores);
    $todosLosRepartidores = $repartidoresResult->fetch_all(MYSQLI_ASSOC);
    $sqlAsistencias = "SELECT * FROM asistencia WHERE fecha = ?";
    $stmt = $conn->prepare($sqlAsistencias);
    $stmt->bind_param("s", $fecha);
    $stmt->execute();
    $asistenciasResult = $stmt->get_result();
    $asistenciasDeHoy = [];
    while ($row = $asistenciasResult->fetch_assoc()) {
        $asistenciasDeHoy[$row['id_repartidor']] = $row;
    }
    $stmt->close();
    $listaFinal = [];
    foreach ($todosLosRepartidores as $repartidor) {
        $id = $repartidor['id_repartidor'];
        if (isset($asistenciasDeHoy[$id])) {
            $listaFinal[] = [ "id" => $id, "name" => $repartidor['nombre'], "entryTime" => $asistenciasDeHoy[$id]['hora_entrada'], "exitTime" => $asistenciasDeHoy[$id]['hora_salida'], "status" => $asistenciasDeHoy[$id]['estado'], "observation" => $asistenciasDeHoy[$id]['observacion'] ];
        } else {
            $listaFinal[] = [ "id" => $id, "name" => $repartidor['nombre'], "entryTime" => "--:--", "exitTime" => "--:--", "status" => "Ausente", "observation" => "" ];
        }
    }
    echo json_encode(["status" => "success", "data" => $listaFinal]);
}

function updateAsistencia($conn, $data) {
    $id_repartidor = $data['id'] ?? 0;
    $fecha = $data['fecha'] ?? date('Y-m-d');
    $hora_entrada = ($data['entryTime'] === '--:--' || empty($data['entryTime'])) ? null : $data['entryTime'];
    $hora_salida = ($data['exitTime'] === '--:--' || empty($data['exitTime'])) ? null : $data['exitTime'];
    $estado = $data['status'] ?? 'Ausente';
    $observacion = $data['observation'] ?? '';
    $sql = "INSERT INTO asistencia (id_repartidor, fecha, hora_entrada, hora_salida, estado, observacion) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE hora_entrada = VALUES(hora_entrada), hora_salida = VALUES(hora_salida), estado = VALUES(estado), observacion = VALUES(observacion)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isssss", $id_repartidor, $fecha, $hora_entrada, $hora_salida, $estado, $observacion);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Asistencia actualizada"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    $stmt->close();
}

// --- FUNCIONES DE REPARTOS ---
function getRepartos($conn) {
    $sql = "SELECT r.id_reparto, r.ticket, d.lugar AS destino, rep.nombre AS repartidor, ven.nombre AS vendedor, r.hora_salida, r.hora_llegada, r.monto_total, r.estado FROM reparto r
            LEFT JOIN destino d ON r.id_destino = d.id_destino
            LEFT JOIN repartidor rep ON r.id_repartidor = rep.id_repartidor
            LEFT JOIN vendedor ven ON r.id_vendedor = ven.id_vendedor
            ORDER BY r.id_reparto DESC";
    $result = $conn->query($sql);
    $items = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode(["status" => "success", "data" => $items]);
}

function createReparto($conn, $data) {
    $ticket = $data['ticket'] ?? '';
    $id_destino = $data['id_destino'] ?? null;
    $id_repartidor = $data['id_repartidor'] ?? null;
    $id_vendedor = $data['id_vendedor'] ?? null;
    $hora_salida = $data['horaSalida'] ?? date('H:i:s');
    $monto_total = $data['montoTotal'] ?? 0.0;
    $fecha_creacion = date('Y-m-d');
    $sql = "INSERT INTO reparto (ticket, id_destino, id_repartidor, id_vendedor, fecha_creacion, hora_salida, monto_total) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("siiissd", $ticket, $id_destino, $id_repartidor, $id_vendedor, $fecha_creacion, $hora_salida, $monto_total);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Reparto agregado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    $stmt->close();
}

function finalizarReparto($conn, $data) {
    $id_reparto = $data['id'] ?? 0;
    $hora_llegada = date('H:i:s');
    $estado = 'finalizado';
    $sql = "UPDATE reparto SET estado = ?, hora_llegada = ? WHERE id_reparto = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssi", $estado, $hora_llegada, $id_reparto);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Reparto finalizado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al actualizar: " . $stmt->error]);
    }
    $stmt->close();
}

// --- FUNCIONES DE PAGOS ---
function getConfiguracion($conn) {
    $sql = "SELECT sueldo_base, tarifa_viaje, costo_falta FROM configuracion WHERE id = 1";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
        $config = $result->fetch_assoc();
        $formattedConfig = [ "sueldoBase" => $config['sueldo_base'], "tarifaViaje" => $config['tarifa_viaje'], "costoFalta" => $config['costo_falta'] ];
        echo json_encode(["status" => "success", "data" => $formattedConfig]);
    } else {
        echo json_encode(["status" => "error", "message" => "No se encontró la configuración"]);
    }
}

function saveConfiguracion($conn, $data) {
    $sueldo_base = $data['sueldoBase'] ?? 0;
    $tarifa_viaje = $data['tarifaViaje'] ?? 0;
    $costo_falta = $data['costoFalta'] ?? 0;
    $sql = "INSERT INTO configuracion (id, sueldo_base, tarifa_viaje, costo_falta) VALUES (1, ?, ?, ?)
            ON DUPLICATE KEY UPDATE sueldo_base = VALUES(sueldo_base), tarifa_viaje = VALUES(tarifa_viaje), costo_falta = VALUES(costo_falta)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ddd", $sueldo_base, $tarifa_viaje, $costo_falta);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Configuración guardada"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar: " . $stmt->error]);
    }
    $stmt->close();
}

function calcularPagos($conn, $data) {
    $fechaInicio = $data['fechaInicio'];
    $fechaFin = $data['fechaFin'];
    $config = $data['configuracion'];
    $sqlRepartidores = "SELECT id_repartidor, nombre FROM repartidor";
    $repartidoresResult = $conn->query($sqlRepartidores);
    $todosLosRepartidores = $repartidoresResult->fetch_all(MYSQLI_ASSOC);
    $sqlViajes = "SELECT id_repartidor, COUNT(id_reparto) as total_viajes FROM reparto WHERE estado = 'finalizado' AND fecha_creacion BETWEEN ? AND ? GROUP BY id_repartidor";
    $stmtViajes = $conn->prepare($sqlViajes);
    $stmtViajes->bind_param("ss", $fechaInicio, $fechaFin);
    $stmtViajes->execute();
    $viajesResult = $stmtViajes->get_result();
    $conteoViajes = [];
    while ($row = $viajesResult->fetch_assoc()) {
        $conteoViajes[$row['id_repartidor']] = $row['total_viajes'];
    }
    $stmtViajes->close();
    $sqlFaltas = "SELECT id_repartidor, COUNT(id_asistencia) as total_faltas FROM asistencia WHERE estado = 'Ausente' AND fecha BETWEEN ? AND ? GROUP BY id_repartidor";
    $stmtFaltas = $conn->prepare($sqlFaltas);
    $stmtFaltas->bind_param("ss", $fechaInicio, $fechaFin);
    $stmtFaltas->execute();
    $faltasResult = $stmtFaltas->get_result();
    $conteoFaltas = [];
    while ($row = $faltasResult->fetch_assoc()) {
        $conteoFaltas[$row['id_repartidor']] = $row['total_faltas'];
    }
    $stmtFaltas->close();
    $reporteCalculado = [];
    foreach ($todosLosRepartidores as $repartidor) {
        $id = $repartidor['id_repartidor'];
        $viajesHechos = $conteoViajes[$id] ?? 0;
        $faltas = $conteoFaltas[$id] ?? 0;
        $sueldoPorViajes = $viajesHechos * $config['tarifaViaje'];
        $totalBruto = $config['sueldoBase'] + $sueldoPorViajes;
        $descuentos = $faltas * $config['costoFalta'];
        $totalNeto = $totalBruto - $descuentos;
        $reporteCalculado[] = [ 'repartidor' => $repartidor['nombre'], 'sueldoBase' => $config['sueldoBase'], 'viajesHechos' => $viajesHechos, 'sueldoPorViajes' => $sueldoPorViajes, 'totalBruto' => $totalBruto, 'descuentos' => $descuentos, 'totalNeto' => $totalNeto ];
    }
    echo json_encode(["status" => "success", "data" => $reporteCalculado]);
}

function saveReporte($conn, $data) {
    // Aquí iría la lógica para guardar el reporte en la tabla 'pago'
    echo json_encode(["status" => "success", "message" => "Reporte guardado (simulado)"]);
}
?>