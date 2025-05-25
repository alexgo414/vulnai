// Gestión de autenticación y validación de usuarios

// ==================== CONFIGURACIÓN Y DEPENDENCIAS ====================

// Nota: API_BASE_URL se obtiene de utils.js que se carga antes
// Funciones de UI se obtienen de ui.js que se carga antes

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

// Función para verificar si el usuario está autenticado
async function verificarAutenticacion() {
    try {
        const response = await fetch(`${API_BASE_URL}/perfil/datos`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('No autenticado');
        }
        
        return true;
    } catch (error) {
        console.log("Usuario no autenticado:", error);
        
        // Usar función de utils.js si está disponible
        if (typeof limpiarSesion === 'function') {
            limpiarSesion();
        } else {
            sessionStorage.clear();
            localStorage.clear();
        }
        
        return false;
    }
}

// Función principal para manejar el login
async function logearUsuario() {
    console.log("Configurando formulario de login...");
    const form = document.getElementById("login-form");
    
    if (!form) {
        console.error("Formulario de login no encontrado");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formulario de inicio de sesión enviado.");

        const username = document.getElementById("username")?.value?.trim();
        const password = document.getElementById("password")?.value;
        const loginBtn = document.querySelector('.login-btn');
        
        // Validar campos
        if (!username || !password) {
            mostrarAlerta("Por favor, completa todos los campos", "warning");
            return;
        }
        
        // Validar datos con función de validación
        const validacion = validarFormularioAuth({ username, password });
        if (!validacion.esValido) {
            mostrarAlerta(validacion.errores.join('<br>'), "danger");
            return;
        }
        
        // Mostrar estado de carga
        if (typeof mostrarCargandoFormulario === 'function') {
            mostrarCargandoFormulario(loginBtn, true, 'Iniciando sesión...');
        } else {
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando sesión...';
        }

        try {
            console.log("Enviando datos de login:", { username, password: "***" });
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            console.log("Respuesta del servidor:", response.status);

            if (!response.ok) {
                let errorMessage = "Usuario o contraseña incorrectos";
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    console.warn("No se pudo parsear error del servidor");
                }
                
                mostrarAlerta(errorMessage, "danger");
                return;
            }

            const data = await response.json();
            console.log("Login exitoso:", data);
            
            // Guardar datos de sesión
            sessionStorage.setItem("username", username);
            if (data.user_id) {
                sessionStorage.setItem("user_id", data.user_id);
            }
            if (data.usuario) {
                sessionStorage.setItem("usuarioActual", JSON.stringify(data.usuario));
            }
            
            // Guardar mensaje de éxito
            sessionStorage.setItem("alertMessage", "¡Inicio de sesión exitoso!");
            sessionStorage.setItem("alertType", "success");

            // Mostrar mensaje de éxito temporal
            mostrarExito("¡Bienvenido! Redirigiendo...");
            
            // Redirigir después de una breve pausa
            setTimeout(() => {
                window.location.href = "/perfil";
            }, 1000);

        } catch (error) {
            console.error("Error en login:", error);
            
            if (typeof handleError === 'function') {
                handleError(error, 'en el login');
            } else {
                mostrarAlerta("Error de conexión. Verifica tu internet y vuelve a intentarlo.", "danger");
            }
        } finally {
            // Restaurar botón
            if (typeof mostrarCargandoFormulario === 'function') {
                mostrarCargandoFormulario(loginBtn, false);
            } else {
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión';
            }
        }
    });
}

// Función para cerrar sesión
async function cerrarSesion() {
    console.log("Cerrando sesión...");
    
    // Mostrar confirmación con UI mejorada si está disponible
    let confirmar = true;
    if (typeof confirmarAccion === 'function') {
        confirmar = await confirmarAccion(
            "¿Cerrar sesión?",
            "¿Estás seguro de que deseas cerrar tu sesión actual?",
            {
                confirmarTexto: "Cerrar Sesión",
                cancelarTexto: "Cancelar",
                confirmarClase: "btn-warning"
            }
        );
    } else {
        confirmar = confirm("¿Estás seguro de que deseas cerrar sesión?");
    }
    
    if (!confirmar) return;
    
    try {
        // Intentar logout en el backend
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include'
        });

        // Limpiar storage independientemente de la respuesta
        if (typeof limpiarSesion === 'function') {
            limpiarSesion();
        } else {
            sessionStorage.clear();
            localStorage.clear();
        }
        
        if (response.ok) {
            console.log("Logout exitoso en el servidor");
            sessionStorage.setItem("alertMessage", "Sesión cerrada correctamente");
            sessionStorage.setItem("alertType", "success");
        } else {
            console.warn("Error en logout del servidor, pero limpiando localmente");
            sessionStorage.setItem("alertMessage", "Sesión cerrada (con advertencia de conexión)");
            sessionStorage.setItem("alertType", "warning");
        }
        
        console.log("Sesión cerrada correctamente");
        window.location.href = "/login";
        
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        
        // Limpiar storage local de todas formas
        if (typeof limpiarSesion === 'function') {
            limpiarSesion();
        } else {
            sessionStorage.clear();
            localStorage.clear();
        }
        
        // Mostrar mensaje y redirigir
        sessionStorage.setItem("alertMessage", "Sesión cerrada (error de conexión)");
        sessionStorage.setItem("alertType", "warning");
        
        window.location.href = "/login";
    }
}

// ==================== FUNCIONES DE TOGGLE DE CONTRASEÑA ====================

// Función para toggle de contraseña en login
function togglePasswordLogin() {
    const input = document.getElementById('password');
    const toggle = document.querySelector('.password-toggle-login i');
    
    if (!input || !toggle) {
        console.error("Elementos de password toggle no encontrados");
        return;
    }
    
    togglePasswordElement(input, toggle);
}

// Función para toggle de contraseña genérico
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    
    if (!input) {
        console.error(`Input de password no encontrado: ${inputId}`);
        return;
    }
    
    // Buscar el toggle en diferentes posiciones posibles
    let toggle = input.nextElementSibling?.querySelector('i');
    
    if (!toggle) {
        // Buscar en el padre
        toggle = input.parentElement?.querySelector('.password-toggle i');
    }
    
    if (!toggle) {
        // Buscar por data attribute
        toggle = document.querySelector(`[data-target="${inputId}"] i`);
    }
    
    if (!toggle) {
        console.error(`Toggle de password no encontrado para: ${inputId}`);
        return;
    }
    
    togglePasswordElement(input, toggle);
}

// Función auxiliar para toggle de password
function togglePasswordElement(input, toggle) {
    if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
        toggle.title = 'Ocultar contraseña';
    } else {
        input.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
        toggle.title = 'Mostrar contraseña';
    }
}

// Función para configurar todos los toggles de password en la página
function configurarTogglePassword() {
    // Configurar toggles con data-target
    document.querySelectorAll('[data-target]').forEach(toggle => {
        const targetId = toggle.getAttribute('data-target');
        toggle.addEventListener('click', () => {
            togglePassword(targetId);
        });
    });
    
    // Configurar toggle específico de login
    const loginToggle = document.querySelector('.password-toggle-login');
    if (loginToggle) {
        loginToggle.addEventListener('click', togglePasswordLogin);
    }
}

// ==================== VALIDACIÓN DE SESIÓN ====================

// Función para validar sesión activa antes de acceder a páginas protegidas
async function validarSesionActiva() {
    const paginasProtegidas = ['/perfil', '/chat', '/dashboard'];
    const paginaActual = window.location.pathname;
    
    // Solo validar en páginas protegidas
    if (!paginasProtegidas.some(pagina => paginaActual.includes(pagina))) {
        return true;
    }
    
    console.log("Validando sesión activa para página protegida:", paginaActual);
    
    const estaAutenticado = await verificarAutenticacion();
    
    if (!estaAutenticado) {
        console.log("Sesión no válida, redirigiendo al login");
        sessionStorage.setItem("alertMessage", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        sessionStorage.setItem("alertType", "warning");
        
        // Agregar delay para evitar loops de redirección
        setTimeout(() => {
            window.location.href = "/login";
        }, 100);
        
        return false;
    }
    
    console.log("Sesión válida");
    return true;
}

// Función para manejar errores de autenticación en requests
function manejarErrorAuth(response) {
    if (response.status === 401) {
        console.log("Error 401: No autorizado");
        
        if (typeof limpiarSesion === 'function') {
            limpiarSesion();
        } else {
            sessionStorage.clear();
            localStorage.clear();
        }
        
        sessionStorage.setItem("alertMessage", "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        sessionStorage.setItem("alertType", "warning");
        
        setTimeout(() => {
            window.location.href = "/login";
        }, 100);
        
        return true;
    }
    
    if (response.status === 403) {
        console.log("Error 403: Prohibido");
        mostrarError("No tienes permisos para realizar esta acción");
        return true;
    }
    
    return false;
}

// ==================== INTERCEPTOR DE REQUESTS ====================

// Función para configurar interceptor de requests (opcional)
function configurarInterceptorAuth() {
    console.log("Configurando interceptor de autenticación...");
    
    // Interceptar fetch global para manejar errores 401/403 automáticamente
    const fetchOriginal = window.fetch;
    
    window.fetch = async function(...args) {
        try {
            const response = await fetchOriginal.apply(this, args);
            
            // Si es 401 o 403, manejar automáticamente
            if (response.status === 401 || response.status === 403) {
                manejarErrorAuth(response);
            }
            
            return response;
        } catch (error) {
            console.error("Error en fetch interceptado:", error);
            throw error;
        }
    };
    
    console.log("Interceptor de autenticación configurado");
}

// ==================== UTILIDADES DE USUARIO ====================

// Función para obtener información del usuario actual
async function obtenerUsuarioActual() {
    try {
        // Primero intentar desde sessionStorage
        const usuarioGuardado = sessionStorage.getItem("usuarioActual");
        if (usuarioGuardado) {
            try {
                return JSON.parse(usuarioGuardado);
            } catch (e) {
                console.warn("Error parseando usuario guardado");
            }
        }
        
        // Si no hay en storage, hacer request
        const response = await fetch(`${API_BASE_URL}/perfil/datos`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al obtener datos del usuario');
        }
        
        const data = await response.json();
        const usuario = data.usuario_actual || null;
        
        // Guardar en sessionStorage para próximas consultas
        if (usuario) {
            sessionStorage.setItem("usuarioActual", JSON.stringify(usuario));
        }
        
        return usuario;
    } catch (error) {
        console.error("Error obteniendo usuario actual:", error);
        return null;
    }
}

// Función para actualizar información del usuario en storage
function actualizarUsuarioActual(usuario) {
    if (usuario) {
        sessionStorage.setItem("usuarioActual", JSON.stringify(usuario));
        return true;
    }
    return false;
}

// ==================== VALIDACIÓN DE FORMULARIOS ====================

// Función para validar formularios de autenticación
function validarFormularioAuth(formData) {
    const errores = [];
    
    // Validar username
    if (!formData.username || formData.username.trim().length < 3) {
        errores.push("El nombre de usuario debe tener al menos 3 caracteres");
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
        errores.push("El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos");
    }
    
    // Validar password
    if (!formData.password || formData.password.length < 6) {
        errores.push("La contraseña debe tener al menos 6 caracteres");
    }
    
    // Validar email si existe
    if (formData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errores.push("El formato del email no es válido");
        }
    }
    
    // Validar nombre si existe
    if (formData.nombre && formData.nombre.trim().length < 2) {
        errores.push("El nombre debe tener al menos 2 caracteres");
    }
    
    // Validar apellidos si existe
    if (formData.apellidos && formData.apellidos.trim().length < 2) {
        errores.push("Los apellidos deben tener al menos 2 caracteres");
    }
    
    return {
        esValido: errores.length === 0,
        errores: errores
    };
}

// Función para validar formulario en tiempo real
function configurarValidacionAuth(form) {
    if (!form) return;
    
    const campos = form.querySelectorAll('input[required]');
    
    campos.forEach(campo => {
        // Validación en blur
        campo.addEventListener('blur', () => {
            validarCampoAuth(campo);
        });
        
        // Validación en input (para feedback inmediato)
        campo.addEventListener('input', debounce(() => {
            validarCampoAuth(campo);
        }, 300));
    });
}

// Función para validar campo individual
function validarCampoAuth(campo) {
    const valor = campo.value.trim();
    const tipo = campo.type;
    const id = campo.id;
    
    let esValido = true;
    let mensaje = '';
    
    // Validaciones específicas por tipo/id
    switch (id) {
        case 'username':
            if (valor.length < 3) {
                esValido = false;
                mensaje = 'Mínimo 3 caracteres';
            } else if (!/^[a-zA-Z0-9_.-]+$/.test(valor)) {
                esValido = false;
                mensaje = 'Solo letras, números, puntos, guiones y guiones bajos';
            }
            break;
            
        case 'password':
            if (valor.length < 6) {
                esValido = false;
                mensaje = 'Mínimo 6 caracteres';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(valor)) {
                esValido = false;
                mensaje = 'Formato de email inválido';
            }
            break;
            
        case 'nombre':
        case 'apellidos':
            if (valor.length < 2) {
                esValido = false;
                mensaje = 'Mínimo 2 caracteres';
            }
            break;
    }
    
    // Aplicar clases de validación
    if (esValido) {
        campo.classList.remove('is-invalid');
        campo.classList.add('is-valid');
        
        // Ocultar mensaje de error
        const feedback = campo.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.style.display = 'none';
        }
    } else {
        campo.classList.remove('is-valid');
        campo.classList.add('is-invalid');
        
        // Mostrar mensaje de error
        let feedback = campo.parentElement.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            campo.parentElement.appendChild(feedback);
        }
        feedback.textContent = mensaje;
        feedback.style.display = 'block';
    }
    
    return esValido;
}

// ==================== REDIRECCIÓN INTELIGENTE ====================

// Función para redirección inteligente después del login
function obtenerURLRedireccion() {
    // Comprobar si hay una URL de retorno guardada
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        return returnUrl;
    }
    
    // URL por defecto
    return '/perfil';
}

// Función para guardar URL de retorno antes de ir al login
function guardarURLRetorno(url = null) {
    const urlActual = url || window.location.pathname;
    if (urlActual !== '/login' && urlActual !== '/') {
        sessionStorage.setItem('returnUrl', urlActual);
    }
}

// ==================== INICIALIZACIÓN ====================

// Auto-inicialización para páginas que requieren autenticación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando módulo Auth...');
    
    // Configurar toggles de password
    configurarTogglePassword();
    
    // Validar sesión en páginas protegidas
    await validarSesionActiva();
    
    // Configurar interceptor si es necesario (opcional)
    // configurarInterceptorAuth();
    
    console.log('Módulo Auth inicializado correctamente');
});

// ==================== EXPORTACIÓN ====================

// Exportar funciones para uso global (si usas módulos ES6 en el futuro)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verificarAutenticacion,
        logearUsuario,
        cerrarSesion,
        togglePasswordLogin,
        togglePassword,
        configurarTogglePassword,
        validarSesionActiva,
        manejarErrorAuth,
        configurarInterceptorAuth,
        obtenerUsuarioActual,
        actualizarUsuarioActual,
        validarFormularioAuth,
        configurarValidacionAuth,
        validarCampoAuth,
        obtenerURLRedireccion,
        guardarURLRetorno
    };
}

console.log('Módulo Auth cargado correctamente');