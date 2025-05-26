// Gestión de autenticación y validación de usuarios

// ==================== CONFIGURACIÓN DESDE CONFIG GLOBAL ====================
// Usar las constantes del archivo config.js
const { API_BASE_URL, CHAT_API_URL } = window.APP_CONFIG;

// ==================== FUNCIONES DE AUTENTICACIÓN CON COOKIES ====================
async function verificarAutenticacion() {
    try {
        const response = await fetch(`${API_BASE_URL}/verify-session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Sesión no válida');
        }
        
        const data = await response.json();
        
        // Actualizar datos locales
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('username', data.username);
        sessionStorage.setItem('usuarioActual', JSON.stringify(data.usuario));
        
        return true;
    } catch (error) {
        console.log("Error de autenticación:", error);
        limpiarSesionCompleta();
        return false;
    }
}

async function logearUsuario() {
    const username = document.getElementById("username")?.value?.trim();
    const password = document.getElementById("password")?.value;
    
    if (!username || !password) {
        mostrarAlerta("Por favor, completa todos los campos", "warning");
        return;
    }
    
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    }

    try {
        console.log("Enviando datos de login...");
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            mostrarAlerta(errorData.error || "Error en el login", "danger");
            return;
        }

        const data = await response.json();
        console.log("Login exitoso:", data);
        
        // Guardar datos en sessionStorage
        sessionStorage.setItem("user_id", data.user_id);
        sessionStorage.setItem("username", data.username);
        sessionStorage.setItem("usuarioActual", JSON.stringify(data.usuario));
        
        mostrarExito("¡Bienvenido! Redirigiendo...");
        
        // CORREGIR: Redirección inmediata
        setTimeout(() => {
            const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/perfil';
            sessionStorage.removeItem('redirect_after_login');
            console.log("Redirigiendo a:", redirectUrl);
            window.location.href = redirectUrl;
        }, 1500); // Aumentar tiempo para ver el mensaje

    } catch (error) {
        console.error("Error en login:", error);
        mostrarAlerta("Error de conexión. Inténtalo de nuevo.", "danger");
    } finally {
        if (loginBtn) {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
}

async function cerrarSesion() {
    console.log("Cerrando sesión...");
    
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" }
        });

        limpiarSesionCompleta();
        
        if (response.ok) {
            console.log("Logout exitoso");
        }
        
        window.location.href = "/login";
        
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        limpiarSesionCompleta();
        window.location.href = "/login";
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================
function limpiarSesionCompleta() {
    sessionStorage.clear();
    localStorage.clear();
}

async function validarSesionActiva() {
    const paginasProtegidas = ['/perfil', '/chat', '/dashboard'];
    const paginaActual = window.location.pathname;
    
    if (!paginasProtegidas.some(pagina => paginaActual.includes(pagina))) {
        return true;
    }
    
    console.log("Validando sesión para página protegida:", paginaActual);
    
    const estaAutenticado = await verificarAutenticacion();
    
    if (!estaAutenticado) {
        console.log("Sesión no válida, redirigiendo al login");
        sessionStorage.setItem('redirect_after_login', paginaActual);
        window.location.href = "/login";
        return false;
    }
    
    return true;
}

// ==================== TOGGLES DE PASSWORD ====================
function configurarTogglePassword() {
    const toggleButtons = document.querySelectorAll('.password-toggle, .password-toggle-login');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const passwordInput = this.parentElement.querySelector('input[type="password"], input[type="text"]');
            const icon = this.querySelector('i');
            
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

// ==================== INTERCEPTOR GLOBAL ====================
function configurarInterceptorAuth() {
    const fetchOriginal = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        try {
            const response = await fetchOriginal(url, defaultOptions);
            
            if (response.status === 401) {
                console.log("Sesión expirada detectada");
                limpiarSesionCompleta();
                
                if (!window.location.pathname.includes('/login')) {
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 1000);
                }
            }
            
            return response;
        } catch (error) {
            console.error("Error en fetch interceptado:", error);
            throw error;
        }
    };
}

// ==================== FUNCIONES ESPECÍFICAS DEL CHAT ====================
async function enviarMensajeChat(mensaje, proyectoId = 'general') {
    try {
        const response = await fetch(`${CHAT_API_URL}/chat/mensajes`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: mensaje,
                proyecto_id: proyectoId
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Sesión expirada');
            }
            throw new Error('Error en el chat');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        throw error;
    }
}

async function obtenerHistorialChat(proyectoId = 'general') {
    try {
        const response = await fetch(`${CHAT_API_URL}/chat/historial/${proyectoId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error obteniendo historial');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        throw error;
    }
}

// ==================== CONFIGURAR LOGIN FORM ====================
function configurarFormularioLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await logearUsuario();
    });
    
    // Enter en los campos
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    [usernameInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    logearUsuario();
                }
            });
        }
    });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando módulo Auth...');
    
    // Configurar interceptor global
    configurarInterceptorAuth();
    
    // Configurar toggles de password
    configurarTogglePassword();
    
    // Configurar formulario de login si existe
    configurarFormularioLogin();
    
    // Validar sesión en páginas protegidas
    await validarSesionActiva();
    
    console.log('Módulo Auth inicializado correctamente');
});

console.log('Módulo Auth cargado correctamente');