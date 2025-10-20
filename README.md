# Proyecto Final: Autosoft - Sistema de Gestión Logística


## 1. Resumen del Proyecto

**Autosoft** es una aplicación web diseñada para la gestión de operaciones en una empresa de reparto. El sistema centraliza la administración de personal (repartidores), la asignación de envíos y el seguimiento de las entregas, con el objetivo de optimizar la eficiencia y organización de la logística.

La plataforma está construida con una arquitectura de cliente-servidor, separando la lógica del negocio en un backend (API REST) y la interfaz de usuario en un frontend (Single Page Application).

## 2. Objetivos del Proyecto

* **Diseñar y modelar** una base de datos para almacenar la información de usuarios, repartos y clientes.
* **Desarrollar un API RESTful** para manejar todas las operaciones del sistema (CRUD de usuarios, repartos, etc.).
* **Implementar un sistema de autenticación** seguro basado en tokens (JWT) para proteger las rutas y los datos.
* **Construir una interfaz de usuario** intuitiva y funcional que permita a los administradores gestionar las operaciones de manera eficiente.
* **Aplicar buenas prácticas** de desarrollo de software, incluyendo el uso de un sistema de control de versiones (Git) y código fuente documentado.

## 3. Alcance y Funcionalidades

El sistema cuenta con dos roles principales: Administrador y Repartidor.

#### Funcionalidades del Administrador:
* ✅ **Login/Logout** seguro.
* ✅ **Dashboard principal** con estadísticas clave (repartos pendientes, completados, etc.).
* ✅ **Gestión de Repartidores:** Crear, ver, actualizar y eliminar perfiles de repartidores.
* ✅ **Gestión de Repartos:**
    * Crear nuevos registros de envío (datos del cliente, dirección, descripción del paquete).
    * Asignar repartos a los repartidores disponibles.
    * Cambiar el estado de un reparto (Pendiente, En Ruta, Entregado, Cancelado).
    * Ver el historial de todos los repartos.

#### Funcionalidades del Repartidor (en desarrollo):
* 🔘 Login/Logout seguro.
* 🔘 Ver la lista de repartos que tiene asignados para el día.
* 🔘 Marcar un reparto como "Entregado".

---

## 4. Stack Tecnológico

A continuación, se listan las tecnologías y herramientas utilizadas para el desarrollo del proyecto:

* **Backend:**
    * **Lenguaje:** JavaScript
    * **Entorno de ejecución:** VScode
    * **Autenticación:** JSON Web Tokens (JWT)
* **Frontend:**
    * **Lenguajes:** HTML5, CSS3, JavaScript (ES6+)
    * **Gestor de paquetes:** npm
* **Base de Datos:**
    * **Sistema:** Mysql
    * **ODM:** XAMPP
* **Control de Versiones:**
    * **Herramienta:** Git
    * **Plataforma:** GitHub

---

## 5. Estructura del Repositorio

El proyecto está organizado en dos carpetas principales para mantener una clara separación de responsabilidades:

* `/backend`: Contiene toda la lógica del servidor, modelos de datos, controladores y rutas de la API.
* `/frontend`: Contiene todos los archivos de la aplicación de React, incluyendo componentes, vistas y estilos.

---

## 6. Guía de Instalación y Ejecución Local

Para poder ejecutar el proyecto en un entorno local, por favor siga los siguientes pasos:

#### **Requisitos Previos:**
* Tener instalado [Php).
* Tener instalado [Git](https://git-scm.com/).
* Tener una instancia de XAMPP corriendo (localmente)

#### **Pasos:**

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
    cd tu-repositorio
    ```

2.  **Configurar el Backend:**
    * Navegar a la carpeta del backend: `cd backend`
    * Crear un archivo `.env` a partir del ejemplo: `cp .env.example .env`
    * Editar el archivo `.env` y añadir la cadena de conexión a su base de datos MongoDB y un secreto para JWT:
        ```
        MONGO_URI=mongodb://...
        JWT_SECRET=un_secreto_muy_dificil
        ```
    * Instalar las dependencias:
        ```bash
        npm install
        ```

3.  **Configurar el Frontend:**
    * Navegar a la carpeta del frontend desde la raíz: `cd frontend`
    * Instalar las dependencias:
        ```bash
        npm install
        ```

4.  **Ejecutar la Aplicación:**
    * **Iniciar el servidor backend:** (Desde la carpeta `/backend`)
        ```bash
        npm start
        ```
    * **Iniciar la aplicación frontend:** (Desde la carpeta `/frontend`, en otra terminal)
        ```bash
        npm run dev
        ```

5.  **Abrir el navegador** en la dirección `http://localhost:3000` 