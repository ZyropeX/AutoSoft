// js/main.js (Versión Mejorada y con Roles)

document.addEventListener("DOMContentLoaded", function() {

    // --- INICIO: Bloqueo de páginas para 'bodega' ---
    const userRole = localStorage.getItem('currentUserRole');
    const currentPage = window.location.pathname.split("/").pop();

    // 1. Define las páginas restringidas para bodega
    // (Asumo que 'reportes.html' es tu dashboard)
    const restrictedPages = [
        'pagos.html', 
        'agregarInfo.html', 
        'reportes.html' 
    ];

    // 2. Comprueba si el rol es 'bodega' y si está en una página restringida
    if (userRole === 'bodega' && restrictedPages.includes(currentPage)) {
        
        // 3. Si es así, muéstrale una alerta y sácalo de ahí
        alert('Acceso Denegado. No tienes permiso para ver esta página.');
        window.location.href = 'bitacora.html'; // Mándalo a su página principal permitida
        
        // 4. Detiene la ejecución del resto del script
        return; 
    }
    // --- FIN: Bloqueo de páginas ---


    const sidebarContainer = document.getElementById('sidebar-container');

    if (sidebarContainer) {
        fetch('./sidebar.html')
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar la barra lateral.');
                return response.text();
            })
            .then(data => {
                sidebarContainer.innerHTML = data;
                initializeSidebar(); // Llama a la función que ahora tiene tu código
            })
            .catch(error => {
                console.error('Error al cargar el sidebar:', error);
                sidebarContainer.innerHTML = '<p style="color:white; padding: 10px;">Error al cargar menú.</p>';
            });
    }
});

function initializeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const logoutBtn = document.getElementById('logout-btn');

    // --- INICIO DE LA MODIFICACIÓN: Mostrar nombre de usuario ---
    // 1. Lee el nombre guardado (que javas.js guardó en el login)
    const nombreGuardado = localStorage.getItem('currentUser');
    
    // 2. Busca el <span> del perfil en el sidebar
    const elementoNombre = document.getElementById('nombre-usuario-sidebar');
    
    // 3. Si ambos existen, actualiza el texto "Perfil" por el nombre
    if (nombreGuardado && elementoNombre) {
        elementoNombre.textContent = nombreGuardado;
    }
    // --- FIN DE LA MODIFICACIÓN ---

    // --- INICIO: Ocultar vistas para 'bodega' ---
    const currentRole = localStorage.getItem('currentUserRole');

    if (currentRole === 'bodega') {
        const pagosLink = document.querySelector('a[href="pagos.html"]');
        const agregarInfoLink = document.querySelector('a[href="agregarInfo.html"]');
        const reportesLink = document.getElementById('reportes-link'); 

        if (pagosLink) pagosLink.style.display = 'none';
        if (agregarInfoLink) agregarInfoLink.style.display = 'none';
        if (reportesLink) reportesLink.style.display = 'none'; 
    }
    // --- FIN: Ocultar vistas ---

    if (!sidebar || !mainContent) return;

    // La barra inicia cerrada por defecto
    sidebar.classList.add('collapsed');

    // Lógica para expandir/colapsar la barra
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    // Lógica mejorada para el botón de Cerrar Sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¿Estás seguro?',
                text: "Estás a punto de cerrar la sesión.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d90429',
                cancelButtonColor: '#6e7881',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Limpia los datos de la sesión del usuario
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentUserRole');
                    
                    // --- CORRECCIÓN DE RUTA DE LOGOUT ---
                    // Redirige al login (un nivel arriba, fuera de la carpeta /html)
                    window.location.href = '../html/index.html'; 
                }
            });
        });
    }

    // Lógica para resaltar el botón de la página activa
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll('.sidebar-btn[href]');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

