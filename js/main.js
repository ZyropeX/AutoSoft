/**
 * main.js
 * Encargado de la lógica global de UI: Sidebar, Seguridad de Roles y Logout.
 * No requiere importar apiService porque trabaja con localStorage.
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("🎨 Cargando UI principal...");

    // ============================================
    // 1. SEGURIDAD DE ROLES (BODEGA)
    // ============================================
    const userRole = localStorage.getItem('currentUserRole');
    const currentPage = window.location.pathname.split("/").pop();

    // Páginas prohibidas para el rol 'bodega'
    const restrictedPages = [
        'pagos.html', 
        'agregarInfo.html', 
        'reportes.html' 
    ];

    if (userRole === 'bodega' && restrictedPages.includes(currentPage)) {
        console.warn(`⛔ Acceso denegado a ${userRole} en ${currentPage}`);
        alert('Acceso Denegado. No tienes permiso para ver esta página.');
        window.location.href = 'bitacora.html'; // Redirigir a zona segura
        return; 
    }

    // ============================================
    // 2. CARGAR SIDEBAR (Barra Lateral)
    // ============================================
    const sidebarContainer = document.getElementById('sidebar-container');

    if (sidebarContainer) {
        // Fetch relativo al HTML actual (src/sidebar.html)
        fetch('./sidebar.html')
            .then(response => {
                if (!response.ok) throw new Error('No se encontró sidebar.html');
                return response.text();
            })
            .then(data => {
                sidebarContainer.innerHTML = data;
                initializeSidebar(); // Inicializar eventos después de cargar HTML
            })
            .catch(error => {
                console.error('Error cargando sidebar:', error);
            });
    }
});

function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const logoutBtn = document.getElementById('logout-btn');

    // --- MOSTRAR NOMBRE DE USUARIO ---
    const nombreGuardado = localStorage.getItem('currentUser');
    const elementoNombre = document.getElementById('nombre-usuario-sidebar');
    
    if (nombreGuardado && elementoNombre) {
        elementoNombre.textContent = nombreGuardado;
    }

    // --- OCULTAR ENLACES PARA BODEGA ---
    const currentRole = localStorage.getItem('currentUserRole');
    if (currentRole === 'bodega') {
        const enlacesOcultos = [
            'pagos.html',
            'agregarInfo.html',
            'reportes.html' // O el ID reportes-link
        ];

        enlacesOcultos.forEach(page => {
            // Buscar por href
            const link = document.querySelector(`a[href="${page}"]`);
            if (link) link.style.display = 'none';
            
            // Buscar por ID específico (caso reportes)
            const linkId = document.getElementById('reportes-link');
            if (linkId) linkId.style.display = 'none';
        });
    }

    // --- FUNCIONALIDAD COLAPSAR BARRA ---
    if (sidebar && mainContent) {
        // Iniciar colapsada en móviles o según preferencia
        sidebar.classList.add('collapsed');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
    }

    // --- LOGOUT (CERRAR SESIÓN) ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            Swal.fire({
                title: '¿Cerrar sesión?',
                text: "¿Estás seguro de salir?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d90429',
                cancelButtonColor: '#6e7881',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    // 1. Limpiar sesión
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    localStorage.removeItem('currentUserId');
                    
                    // 2. Redirigir al Login
                    // Como bitacora.html e index.html (login) están en la misma carpeta 'src', 
                    // la ruta correcta es simplemente 'index.html'.
                    window.location.href = 'index.html'; 
                }
            });
        });
    }

    // --- RESALTAR PÁGINA ACTIVA ---
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll('.sidebar-btn');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}