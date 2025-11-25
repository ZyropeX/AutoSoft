import { api } from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Login script cargado");

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleLogin();
        });
    }

    // --- Lógica de Mostrar/Ocultar Contraseña ---
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeOpen = document.getElementById('eyeOpen');
    const eyeClosed = document.getElementById('eyeClosed');

    if (passwordInput && togglePassword) {
        // Mostrar el icono solo si hay texto
        passwordInput.addEventListener('input', function() {
            togglePassword.style.display = passwordInput.value.length > 0 ? 'block' : 'none';
        });

        // Click en el ojo
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
 * Función Principal de Login
 */
async function handleLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    const usuario = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // 1. Validación básica
    if (!usuario || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Datos incompletos',
            text: 'Por favor ingresa usuario y contraseña.',
            confirmButtonColor: '#d90429'
        });
        return;
    }

    // Mostrar feedback de carga
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerText : 'Entrar';
    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verificando...';
    }

    try {
        console.log(`🔐 Intentando login para: ${usuario}...`);

        // 2. Llamada a la API
        // NOTA: Asegúrate que apiService tenga la función 'login' apuntando a /empleados/login
        const response = await api.login(usuario, password);
        
        console.log('Respuesta servidor:', response);

        // 3. Verificación de éxito
        // Java puede devolver el objeto empleado directamente O un wrapper {status: 'success'}
        // Ajustamos la lógica para aceptar ambos casos
        const esExito = (response.status === 'success') || (response.id && response.nombre) || (response.id_empleado);

        if (esExito) {
            // Extraer datos del empleado
            const empleado = response.data || response; 
            const nombreUser = empleado.nombre || empleado.usuario || usuario;
            const rolUser = empleado.rol || empleado.puesto || 'empleado';

            console.log("✅ Login correcto:", nombreUser);

            // 4. Guardar sesión
            localStorage.setItem('currentUser', nombreUser);
            localStorage.setItem('currentUserRole', rolUser);
            // Guardamos ID por si se necesita para operaciones
            localStorage.setItem('currentUserId', empleado.id || empleado.id_empleado);

            // 5. Redirección
            await Swal.fire({
                icon: 'success',
                title: `¡Hola, ${nombreUser}!`,
                text: 'Ingresando al sistema...',
                timer: 1500,
                showConfirmButton: false
            });
            
            // Asumiendo que index.html y bitacora.html están en la misma carpeta src
            window.location.href = './bitacora.html'; 

        } else {
            // Error de credenciales
            throw new Error(response.message || 'Usuario o contraseña incorrectos.');
        }

    } catch (error) {
        console.error('❌ Error Login:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Acceso Denegado',
            text: error.message || 'No se pudo conectar con el servidor.',
            confirmButtonColor: '#d90429'
        });
    } finally {
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    }
}
