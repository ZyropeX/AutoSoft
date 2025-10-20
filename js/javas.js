import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleLogin();
        });
    }

    // --- Lógica para mostrar/ocultar contraseña (sin cambios) ---
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeOpen = document.getElementById('eyeOpen');
    const eyeClosed = document.getElementById('eyeClosed');

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (togglePassword) {
                togglePassword.style.display = passwordInput.value.length > 0 ? 'block' : 'none';
            }
        });
    }

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (eyeOpen && eyeClosed) {
                eyeOpen.style.display = isPassword ? 'none' : 'inline';
                eyeClosed.style.display = isPassword ? 'inline' : 'none';
            }
        });
    }
});

/**
 * Maneja el evento de login llamando al servicio de la API y verificando la respuesta.
 */
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        // Llama a nuestro servicio centralizado para obtener la respuesta de la API
        const response = await api.login(username, password);
        
        // Verifica si el login fue exitoso según el 'status' de la respuesta
        if (response.status === 'success') {
            const empleado = response.data; // Extrae los datos del empleado
            
            console.log("Login exitoso para:", empleado.nombre, "con rol:", empleado.rol);

            // Guarda los datos en localStorage para usarlos en otras páginas
            localStorage.setItem('currentUser', empleado.nombre);
            localStorage.setItem('currentUserRole', empleado.rol);

            // Muestra la alerta de bienvenida y redirige
            await Swal.fire({
                icon: 'success',
                title: `¡Bienvenido, ${empleado.nombre}!`,
                text: 'Serás redirigido en un momento.',
                timer: 2000,
                showConfirmButton: false,
                allowOutsideClick: false
            });
            
            window.location.href = '../html/bitacora.html';

        } else {
            // Si el status no es 'success', lanzamos un error con el mensaje de la API
            throw new Error(response.message);
        }

    } catch (error) {
        // Este bloque ahora atrapa tanto errores de red como credenciales incorrectas
        console.error('Error de login:', error.message);
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'El usuario o la contraseña son incorrectos.',
            confirmButtonColor: '#d90429'
        });
    }
}