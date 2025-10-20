// js/main.js (Versión Mejorada)

document.addEventListener("DOMContentLoaded", function() {
    const sidebarContainer = document.getElementById('sidebar-container');

    if (sidebarContainer) {
        fetch('./sidebar.html')
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar la barra lateral.');
                return response.text();
            })
            .then(data => {
                sidebarContainer.innerHTML = data;
                initializeSidebar();
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
                    // Redirige al login
                    window.location.href = 'index.html'; // Asegúrate que esta es la ruta a tu login
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