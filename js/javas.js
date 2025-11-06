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

    // Validar que no estén vacíos
    if (!username || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos Vacíos',
            text: 'Por favor completa el usuario y la contraseña.',
            confirmButtonColor: '#d90429'
        });
        return;
    }

    try {
        // Llama a nuestro servicio centralizado para obtener la respuesta de la API
        const response = await api.login(username, password);
        
        console.log('Respuesta de login:', response);

        // Verifica si el login fue exitoso según el 'status' de la respuesta
        if (response.status === 'success' && response.data) {
            const empleado = response.data;
            
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
            
            window.location.href = './bitacora.html';

        } else {
            // Si el status no es 'success', extraer el mensaje de error
            const errorMessage = response.message || 'Error desconocido en el servidor. Intenta de nuevo.';
            console.error('Error de login:', errorMessage);
            
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: errorMessage,
                confirmButtonColor: '#d90429'
            });
        }

    } catch (error) {
        // Este bloque atrapa errores inesperados
        console.error('Excepción en login:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error del Sistema',
            text: 'Ocurrió un error inesperado. Intenta de nuevo.',
            confirmButtonColor: '#d90429'
        });
    }
}