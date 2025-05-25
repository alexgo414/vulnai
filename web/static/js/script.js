// Archivo principal - Orquestador de módulos

console.log("¡Script principal cargado!");

// ==================== CONFIGURACIÓN GLOBAL ====================

// Variables globales compartidas (si es necesario)
let isInChat = false;

// ==================== FUNCIONES DE INICIALIZACIÓN POR PÁGINA ====================

// Función para inicializar página de login
function inicializarLogin() {
    console.log("Inicializando página de login...");
    
    if (typeof logearUsuario === 'function') {
        logearUsuario();
    } else {
        console.error("Función logearUsuario no disponible");
    }
}

// Función para inicializar página de chat
function inicializarChat() {
    console.log("Inicializando página de chat...");
    
    // Marcar que estamos en chat
    isInChat = true;
    
    try {
        // Inicializar interfaz de chat
        const elementos = inicializarInterfazChat();
        
        if (elementos.chatMensajes && elementos.messageInput && elementos.sendButton) {
            // Configurar funcionalidad del chat
            configurarChat(elementos.chatMensajes, elementos.messageInput, elementos.sendButton);
            configurarEnvioConEnter(elementos.messageInput, elementos.sendButton);
            
            // Cargar proyectos en el sidebar
            renderizarNombresProyectosSidebarChat();
            
            // Cargar historial inicial con delay
            setTimeout(() => {
                const proyectoGuardado = localStorage.getItem('proyectoActualChat');
                const proyectoACargar = proyectoGuardado || 'general';
                
                console.log("Cargando historial del proyecto:", proyectoACargar);
                
                cargarHistorialProyecto(proyectoACargar).then(() => {
                    setTimeout(() => {
                        scrollToBottomForzado();
                        console.log("Scroll final después de cargar historial inicial");
                    }, 1200);
                });
            }, 800);
        }
    } catch (error) {
        console.error("Error inicializando chat:", error);
    }
}

// Función para inicializar página de perfil/dashboard
function inicializarPerfil() {
    console.log("Inicializando página de perfil...");
    
    if (typeof cargarDatosPerfil === 'function') {
        cargarDatosPerfil();
    } else {
        console.error("Función cargarDatosPerfil no disponible");
    }
}

// Función para inicializar formularios
function inicializarFormularios() {
    console.log("Inicializando formularios...");
    
    // Formulario de crear proyecto
    if (document.getElementById("crear-proyecto-form")) {
        console.log("Configurando formulario de crear proyecto...");
        if (typeof configurarFormularioCrearProyecto === 'function') {
            configurarFormularioCrearProyecto();
        }
    }

    // Formulario de crear usuario
    if (document.getElementById("usuario-nuevo-form")) {
        console.log("Configurando formulario de crear usuario...");
        if (typeof configurarFormularioCrearUsuario === 'function') {
            configurarFormularioCrearUsuario();
        }
    }

    // Configurar validación para formularios generales
    if (document.querySelector('.form-container') && typeof configurarValidacionFormulario === 'function') {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            configurarValidacionFormulario(form);
        });
    }
}

// Función para inicializar edición
function inicializarEdicion() {
    console.log("Inicializando páginas de edición...");
    
    // Edición de proyectos
    if (document.getElementById("proyecto-editar-container")) {
        const pathParts = window.location.pathname.split("/");
        const proyectoId = pathParts[pathParts.length - 1];
        console.log("Editando proyecto ID:", proyectoId);
        
        if (typeof configurarFormularioEditarProyecto === 'function') {
            configurarFormularioEditarProyecto(proyectoId);
        }
    }

    // Edición de usuarios
    if (document.getElementById("usuario-editar-container")) {
        const pathParts = window.location.pathname.split("/");
        const usuarioId = pathParts[pathParts.length - 1];
        console.log("Editando usuario ID:", usuarioId);
        
        if (typeof configurarFormularioEditarUsuario === 'function') {
            configurarFormularioEditarUsuario(usuarioId);
        }
    }
}

// ==================== FUNCIONES AUXILIARES ====================

// Función para verificar si estamos en la página de inicio
function esPageHome() {
    const path = window.location.pathname;
    return path === '/' || path === '/index' || path === '/index.html';
}

// Función para inicializar interfaz de chat (wrapper)
function inicializarInterfazChat() {
    const chatMensajes = document.getElementById('chat-messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    if (!chatMensajes || !messageInput || !sendButton) {
        console.error('Elementos del chat no encontrados');
        return { chatMensajes: null, messageInput: null, sendButton: null };
    }

    // Limpiar mensajes existentes
    chatMensajes.innerHTML = '';

    // Mostrar mensaje de bienvenida
    const mensajeBienvenida = document.createElement('div');
    mensajeBienvenida.classList.add('campo-bot');
    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="mensaje-bot">
            <p>¡Hola! Soy tu asistente de IA especializado en desarrollo seguro. ¿En qué puedo ayudarte hoy?</p>
        </div>
    `;
    chatMensajes.appendChild(mensajeBienvenida);
    
    if (typeof scrollToBottom === 'function') {
        scrollToBottom(chatMensajes);
    }

    return { chatMensajes, messageInput, sendButton };
}

// Función para detectar y configurar página
function detectarYConfigurarPagina() {
    const currentPath = window.location.pathname;
    console.log("Página actual:", currentPath);
    
    // Detectar contexto global
    if (typeof detectarContexto === 'function') {
        detectarContexto();
    }
    
    // Detectar tipo de página e inicializar apropiadamente
    if (currentPath.includes('/login')) {
        inicializarLogin();
    } else if (currentPath.includes('/chat')) {
        inicializarChat();
    } else if (currentPath.includes('/perfil')) {
        if (currentPath.includes('editar')) {
            inicializarEdicion();
        } else if (currentPath.includes('nuevo')) {
            inicializarFormularios();
        } else {
            inicializarPerfil();
        }
    } else if (currentPath === '/' || currentPath === '/index' || currentPath === '/index.html') {
        // Página de inicio - delegamos al módulo index.js
        console.log("Página de inicio detectada - delegando a módulo index.js");
        if (typeof inicializarIndex === 'function') {
            inicializarIndex();
        } else {
            console.warn("Módulo index.js no cargado o función inicializarIndex no disponible");
        }
    } else {
        // Página general
        console.log("Página general detectada");
    }
    
    // Siempre inicializar formularios si existen
    inicializarFormularios();
}

// Función para mostrar alertas pendientes
function procesarAlertasPendientes() {
    const alertMessage = sessionStorage.getItem("alertMessage");
    const alertType = sessionStorage.getItem("alertType");
    
    if (alertMessage && alertType) {
        setTimeout(() => {
            if (typeof mostrarAlerta === 'function') {
                mostrarAlerta(alertMessage, alertType);
            } else {
                console.log("Alerta pendiente:", alertType, alertMessage);
            }
        }, 100);
        
        // Limpiar alertas después de mostrarlas
        sessionStorage.removeItem("alertMessage");
        sessionStorage.removeItem("alertType");
    }
}

// ==================== FUNCIONES DE ANIMACIÓN Y UI ====================

// Función de animación para pasos (NO para página de inicio)
function animateSteps() {
    // NO ejecutar en página de inicio (el módulo index.js se encarga)
    if (esPageHome()) {
        console.log("Animaciones del home delegadas al módulo index.js");
        return;
    }
    
    // Solo ejecutar si hay elementos step
    if (!document.querySelectorAll('.step').length) return;
    
    // Configuración de animación
    const config = {
        transitionDuration: '2s',
        transitionDelay: '0.8s',
        delayBetweenSteps: 2000,
        easing: 'ease-out'
    };
    
    let animationDelay = 0;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('step-visible');
                    
                    const elementsToAnimate = entry.target.querySelectorAll('.step-header, .step-title, .step-text, .step-image');
                    
                    elementsToAnimate.forEach((el, index) => {
                        el.style.transition = `opacity ${config.transitionDuration} ${config.easing} ${config.transitionDelay}, 
                                             transform ${config.transitionDuration} ${config.easing} ${config.transitionDelay}`;
                        
                        setTimeout(() => {
                            el.classList.add('step-visible');
                        }, index * 200);
                    });
                }, animationDelay);
                
                animationDelay += config.delayBetweenSteps;
                observer.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
    });

    document.querySelectorAll('.step').forEach(step => {
        step.style.transition = `opacity ${config.transitionDuration} ${config.easing}, 
                               transform ${config.transitionDuration} ${config.easing}`;
        observer.observe(step);
    });
    
    // Reset cuando volvemos arriba
    window.addEventListener('scroll', () => {
        if (window.scrollY < 300) {
            animationDelay = 0;
        }
    });

    // Observer para tarjetas
    const cardObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('card-pop-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card').forEach(card => {
        cardObserver.observe(card);
    });
}

// ==================== FUNCIONES DE SCROLL ====================

// Función básica de scroll (wrapper para compatibilidad)
function scrollToBottom(container) {
    if (!container) return;
    
    // Usar función de utils si está disponible
    if (typeof scrollToBottomForzado === 'function') {
        scrollToBottomForzado(container);
    } else {
        // Fallback básico
        const lastChild = container.lastElementChild;
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// ==================== MANEJADORES DE EVENTOS GLOBALES ====================

// Configurar eventos globales de la aplicación
function configurarEventosGlobales() {
    console.log("Configurando eventos globales...");
    
    // Evento para enlaces de cerrar sesión
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="logout"]') || 
            e.target.closest('[data-action="logout"]')) {
            e.preventDefault();
            
            if (typeof cerrarSesion === 'function') {
                cerrarSesion();
            } else {
                console.error("Función cerrarSesion no disponible");
            }
        }
    });
    
    // Eventos para botones de limpiar chat
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="clear-chat"]') || 
            e.target.closest('[data-action="clear-chat"]')) {
            e.preventDefault();
            
            if (typeof limpiarChat === 'function') {
                limpiarChat();
            } else {
                console.error("Función limpiarChat no disponible");
            }
        }
    });
    
    // Manejar errores globales
    window.addEventListener('error', function(e) {
        console.error('Error global capturado:', e.error);
        
        if (typeof handleError === 'function') {
            handleError(e.error, 'Error global');
        }
    });
    
    // Manejar promesas rechazadas
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Promesa rechazada no manejada:', e.reason);
        
        if (typeof handleError === 'function') {
            handleError(e.reason, 'Promesa rechazada');
        }
    });
}

// ==================== FUNCIÓN DE DIAGNÓSTICO ====================

function diagnosticarModulos() {
    console.log("=== DIAGNÓSTICO DE MÓDULOS ===");
    
    const modulos = [
        'utils.js',
        'ui.js', 
        'auth.js',
        'users.js',
        'projects.js',
        'chat.js',
        'markdown.js',
        'index.js'  // ✅ AÑADIR
    ];
    
    const funcionesEsenciales = [
        'mostrarAlerta',
        'logearUsuario',
        'cargarDatosPerfil',
        'configurarFormularioCrearUsuario',
        'configurarFormularioCrearProyecto',
        'inicializarIndex'  // ✅ AÑADIR
    ];
    
    console.log("Módulos esperados:", modulos);
    console.log("Funciones esenciales disponibles:");
    
    funcionesEsenciales.forEach(func => {
        const disponible = typeof window[func] === 'function';
        console.log(`- ${func}: ${disponible ? '✅' : '❌'}`);
    });
    
    // ✅ AÑADIR: Diagnóstico específico para página de inicio
    if (esPageHome()) {
        console.log("--- DIAGNÓSTICO ESPECÍFICO PÁGINA INICIO ---");
        console.log(`- Módulo index.js cargado: ${typeof inicializarIndex === 'function' ? '✅' : '❌'}`);
        console.log(`- Función esPageHome: ${typeof esPageHome === 'function' ? '✅' : '❌'}`);
        console.log(`- Función limpiarIndex: ${typeof limpiarIndex === 'function' ? '✅' : '❌'}`);
    }
    
    console.log("=== FIN DIAGNÓSTICO ===");
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================

// Función principal de inicialización
function inicializarAplicacion() {
    console.log("🚀 Inicializando aplicación...");
    
    try {
        // 1. Procesar alertas pendientes
        procesarAlertasPendientes();
        
        // 2. Configurar eventos globales
        configurarEventosGlobales();
        
        // 3. Detectar y configurar página actual
        detectarYConfigurarPagina();
        
        // 4. Inicializar animaciones si corresponde (NO para index)
        if (!esPageHome()) {
            animateSteps();
        }
        
        // 5. Guardar estado de página inicial
        sessionStorage.setItem('wasHomePage', esPageHome().toString());
        
        // 6. Diagnóstico de módulos (solo en desarrollo)
        if (window.location.hostname === 'localhost') {
            diagnosticarModulos();
        }
        
        console.log("✅ Aplicación inicializada correctamente");
        
    } catch (error) {
        console.error("❌ Error inicializando aplicación:", error);
        
        if (typeof handleError === 'function') {
            handleError(error, 'Inicialización de aplicación');
        }
    }
}

// ==================== EVENT LISTENERS PRINCIPALES ====================

// Cuando el DOM está listo
document.addEventListener("DOMContentLoaded", inicializarAplicacion);

// Cuando toda la página está cargada (incluyendo imágenes, CSS, etc.)
window.addEventListener("load", function() {
    console.log("🎯 Página completamente cargada");
    
    // Cualquier inicialización que requiera que todo esté cargado
    if (typeof inicializarDespuesDeCargar === 'function') {
        inicializarDespuesDeCargar();
    }
});

// Manejar cambios de historial (navegación SPA si la implementas en el futuro)
window.addEventListener("popstate", function(e) {
    console.log("Cambio de historial detectado");
    
    // Limpiar index si salimos de la página de inicio
    const wasHomePage = sessionStorage.getItem('wasHomePage') === 'true';
    const isHomePage = esPageHome();
    
    if (wasHomePage && !isHomePage && typeof limpiarIndex === 'function') {
        limpiarIndex();
    }
    
    // Actualizar estado
    sessionStorage.setItem('wasHomePage', isHomePage.toString());
    
    detectarYConfigurarPagina();
});

// ==================== COMPATIBILIDAD Y FALLBACKS ====================

// Funciones de compatibilidad para código legacy (temporal)
function renderizarProyectos(...args) {
    if (typeof renderizarProyectosCompatibilidad === 'function') {
        return renderizarProyectosCompatibilidad(...args);
    }
    console.warn("Función renderizarProyectos no disponible");
}

function renderizarUsuarios(...args) {
    if (typeof renderizarUsuariosCompatibilidad === 'function') {
        return renderizarUsuariosCompatibilidad(...args);
    }
    console.warn("Función renderizarUsuarios no disponible");
}

function eliminarProyecto(...args) {
    if (typeof eliminarProyectoCompatibilidad === 'function') {
        return eliminarProyectoCompatibilidad(...args);
    }
    console.warn("Función eliminarProyecto no disponible");
}

function eliminarUsuario(...args) {
    if (typeof eliminarUsuarioCompatibilidad === 'function') {
        return eliminarUsuarioCompatibilidad(...args);
    }
    console.warn("Función eliminarUsuario no disponible");
}

// ==================== INFORMACIÓN DE VERSIÓN ====================

console.log("📦 Script principal v2.1 - Arquitectura Modular + Index");
console.log("🔧 Módulos: Utils, UI, Auth, Users, Projects, Chat, Markdown, Index");
console.log("🏠 Index: Módulo especializado para página de inicio");
console.log("📅 Actualizado:", new Date().toLocaleDateString());