// Módulo de UI - Interfaz de Usuario y Utilidades Visuales

// ==================== CONFIGURACIÓN Y CONSTANTES ====================
const UI_CONFIG = {
    animationDuration: 300,
    alertDuration: 5000,
    scrollDuration: 500,
    notificationDuration: 3000,
    debounceDelay: 300,
    transitionDelay: 100
};

// ==================== SISTEMA DE ALERTAS ====================

// Función principal para mostrar alertas
function mostrarAlerta(mensaje, tipo = "info", flotante = false) {
    const alertContainer = flotante ? 
        document.body : 
        document.querySelector('.alert-container') || document.body;
    
    const alertId = 'alert-' + Date.now();
    const iconMap = {
        'success': 'fas fa-check-circle',
        'danger': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle',
        'primary': 'fas fa-star',
        'secondary': 'fas fa-cog'
    };
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${tipo} alert-dismissible fade ${flotante ? 'alert-floating' : ''} ${flotante ? 'alert-custom' : ''}`;
    alert.setAttribute('role', 'alert');
    
    alert.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">
                <i class="${iconMap[tipo] || iconMap.info}"></i>
            </div>
            <div class="alert-text">
                <div class="alert-message">${mensaje}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Insertar alerta
    if (flotante) {
        alertContainer.appendChild(alert);
    } else {
        alertContainer.insertBefore(alert, alertContainer.firstChild);
    }
    
    // Animar entrada
    setTimeout(() => {
        alert.classList.add('show');
    }, UI_CONFIG.transitionDelay);
    
    // Auto-remover después del tiempo especificado
    const autoRemoveTimer = setTimeout(() => {
        removerAlerta(alertId);
    }, UI_CONFIG.alertDuration);
    
    // Event listener para cerrar manualmente
    const closeBtn = alert.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoRemoveTimer);
        removerAlerta(alertId);
    });
    
    return alertId;
}

// Función para remover alertas
function removerAlerta(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.classList.remove('show');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, UI_CONFIG.animationDuration);
    }
}

// Funciones específicas de alertas
function mostrarExito(mensaje, flotante = true) {
    return mostrarAlerta(mensaje, 'success', flotante);
}

function mostrarError(mensaje, flotante = true) {
    return mostrarAlerta(mensaje, 'danger', flotante);
}

function mostrarAdvertencia(mensaje, flotante = true) {
    return mostrarAlerta(mensaje, 'warning', flotante);
}

function mostrarInfo(mensaje, flotante = true) {
    return mostrarAlerta(mensaje, 'info', flotante);
}

// ==================== SISTEMA DE NOTIFICACIONES MINI ====================

function mostrarNotificacion(mensaje, tipo = 'info', duracion = UI_CONFIG.notificationDuration) {
    const notificationId = 'notification-' + Date.now();
    const iconMap = {
        'success': 'fas fa-check',
        'error': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `mini-notification mini-notification-${tipo}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="${iconMap[tipo] || iconMap.info}"></i>
            <span class="notification-text">${mensaje}</span>
        </div>
        <button class="notification-close" onclick="removerNotificacion('${notificationId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 50);
    
    // Auto-remover
    setTimeout(() => {
        removerNotificacion(notificationId);
    }, duracion);
    
    return notificationId;
}

function removerNotificacion(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, UI_CONFIG.animationDuration);
    }
}

// ==================== SISTEMA DE MODALES DE CONFIRMACIÓN ====================

function mostrarConfirmacion(titulo, mensaje, callback, opciones = {}) {
    const defaultOptions = {
        confirmarTexto: 'Confirmar',
        cancelarTexto: 'Cancelar',
        confirmarClase: 'btn-primary',
        cancelarClase: 'btn-secondary',
        tipo: 'question',
        mostrarIcono: true
    };
    
    const opts = { ...defaultOptions, ...opciones };
    const modalId = 'modal-confirmacion-' + Date.now();
    
    const iconMap = {
        'question': 'fas fa-question-circle',
        'warning': 'fas fa-exclamation-triangle',
        'danger': 'fas fa-trash',
        'info': 'fas fa-info-circle'
    };
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay confirmation-modal-overlay';
    
    modal.innerHTML = `
        <div class="confirmation-modal">
            <div class="confirmation-header">
                ${opts.mostrarIcono ? `<i class="${iconMap[opts.tipo]}"></i>` : ''}
                <h4 class="confirmation-title">${titulo}</h4>
            </div>
            <div class="confirmation-body">
                <p class="confirmation-message">${mensaje}</p>
            </div>
            <div class="confirmation-actions">
                <button class="btn ${opts.confirmarClase} btn-confirm">
                    <i class="fas fa-check me-2"></i>${opts.confirmarTexto}
                </button>
                <button class="btn ${opts.cancelarClase} btn-cancel">
                    <i class="fas fa-times me-2"></i>${opts.cancelarTexto}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    const btnConfirm = modal.querySelector('.btn-confirm');
    const btnCancel = modal.querySelector('.btn-cancel');
    
    btnConfirm.addEventListener('click', () => {
        removerModal(modalId);
        if (callback) callback(true);
    });
    
    btnCancel.addEventListener('click', () => {
        removerModal(modalId);
        if (callback) callback(false);
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            removerModal(modalId);
            if (callback) callback(false);
        }
    });
    
    // Animar entrada
    setTimeout(() => modal.classList.add('show'), 50);
    
    return modalId;
}

// Versión con Promise para confirmación
function confirmarAccion(titulo, mensaje, opciones = {}) {
    return new Promise((resolve) => {
        mostrarConfirmacion(titulo, mensaje, (resultado) => {
            resolve(resultado);
        }, opciones);
    });
}

function removerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, UI_CONFIG.animationDuration);
    }
}

// ==================== SISTEMA DE CARGA (LOADING) ====================

function mostrarCargando(elemento, texto = 'Cargando...', mantenerTexto = false) {
    if (typeof elemento === 'string') {
        elemento = document.getElementById(elemento) || document.querySelector(elemento);
    }
    
    if (!elemento) return;
    
    // Guardar contenido original
    if (!elemento.dataset.originalContent) {
        elemento.dataset.originalContent = elemento.innerHTML;
        elemento.dataset.originalDisabled = elemento.disabled || false;
    }
    
    elemento.disabled = true;
    elemento.classList.add('loading');
    
    if (!mantenerTexto) {
        elemento.innerHTML = `
            <span class="loading-content">
                <i class="fas fa-spinner fa-spin me-2"></i>
                ${texto}
            </span>
        `;
    } else {
        // Añadir spinner al contenido existente
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin me-2 loading-spinner';
        elemento.insertBefore(spinner, elemento.firstChild);
    }
}

function ocultarCargando(elemento) {
    if (typeof elemento === 'string') {
        elemento = document.getElementById(elemento) || document.querySelector(elemento);
    }
    
    if (!elemento) return;
    
    elemento.classList.remove('loading');
    
    // Restaurar contenido original
    if (elemento.dataset.originalContent) {
        elemento.innerHTML = elemento.dataset.originalContent;
        elemento.disabled = elemento.dataset.originalDisabled === 'true';
        
        delete elemento.dataset.originalContent;
        delete elemento.dataset.originalDisabled;
    } else {
        // Remover solo el spinner si se añadió al contenido existente
        const spinner = elemento.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        elemento.disabled = false;
    }
}

// ==================== SKELETON LOADING ====================

function mostrarSkeletonLoading() {
    const containers = document.querySelectorAll('.skeleton-container');
    containers.forEach(container => {
        container.classList.add('loading');
        container.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-footer">
                    <div class="skeleton-button"></div>
                    <div class="skeleton-button"></div>
                </div>
            </div>
        `.repeat(6);
    });
}

function ocultarSkeletonLoading() {
    const containers = document.querySelectorAll('.skeleton-container');
    containers.forEach(container => {
        container.classList.remove('loading');
    });
}

// ==================== ANIMACIONES ====================

// Función para animar elementos al hacer scroll
function configurarAnimacionesScroll() {
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar elementos con clase animate-on-scroll
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Función para animar tarjetas
function configurarAnimacionesTarjetas() {
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('card-animate-visible');
                }, index * 100);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.card, .project-card, .user-card').forEach(card => {
        card.classList.add('card-animate');
        cardObserver.observe(card);
    });
}

// Función para animar números/estadísticas
function animarNumeros() {
    const numeros = document.querySelectorAll('.stats-number, .animate-number');
    
    numeros.forEach(numero => {
        const valorFinal = parseInt(numero.textContent) || 0;
        const duracion = 2000; // 2 segundos
        const pasos = 50;
        const incremento = valorFinal / pasos;
        
        numero.textContent = '0';
        let valorActual = 0;
        
        const timer = setInterval(() => {
            valorActual += incremento;
            
            if (valorActual >= valorFinal) {
                numero.textContent = valorFinal;
                clearInterval(timer);
            } else {
                numero.textContent = Math.floor(valorActual);
            }
        }, duracion / pasos);
    });
}

// Configurar animaciones de pasos (para páginas de bienvenida)
function configurarAnimacionesPasos() {
    const config = {
        transitionDuration: '2s',
        transitionDelay: '0.8s',
        delayBetweenSteps: 2000,
        easing: 'ease-out'
    };
    
    let animationDelay = 0;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('step-visible');
                    
                    const elementsToAnimate = entry.target.querySelectorAll(
                        '.step-header, .step-title, .step-text, .step-image'
                    );
                    
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
}

// ==================== UTILIDADES DE SCROLL ====================

function scrollToBottom(container, suave = true) {
    if (!container) return;
    
    if (suave) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        container.scrollTop = container.scrollHeight;
    }
}

function scrollToBottomForzado(container) {
    if (!container) return;
    
    container.scrollTop = container.scrollHeight;
    
    // Múltiples intentos para asegurar el scroll
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 300);
}

function scrollToElement(elemento, offset = 0) {
    if (typeof elemento === 'string') {
        elemento = document.getElementById(elemento) || document.querySelector(elemento);
    }
    
    if (!elemento) return;
    
    const rect = elemento.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPosition = rect.top + scrollTop - offset;
    
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

// ==================== VALIDACIÓN DE FORMULARIOS ====================

function configurarValidacionFormulario(formulario) {
    if (typeof formulario === 'string') {
        formulario = document.getElementById(formulario) || document.querySelector(formulario);
    }
    
    if (!formulario) return;
    
    const inputs = formulario.querySelectorAll('.form-control, input, textarea, select');
    
    inputs.forEach(input => {
        // Validación en tiempo real
        input.addEventListener('blur', () => validarCampo(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) {
                validarCampo(input);
            }
        });
        
        // Eventos especiales para diferentes tipos de input
        if (input.type === 'email') {
            input.addEventListener('input', () => validarEmail(input));
        }
        
        if (input.type === 'password') {
            input.addEventListener('input', () => validarPassword(input));
        }
    });
    
    // Validación al enviar formulario
    formulario.addEventListener('submit', (e) => {
        if (!validarFormularioCompleto(formulario)) {
            e.preventDefault();
            mostrarError('Por favor, corrige los errores en el formulario');
        }
    });
}

function validarCampo(campo) {
    const valor = campo.value.trim();
    const esRequerido = campo.hasAttribute('required');
    const tipo = campo.type;
    
    // Limpiar clases previas
    campo.classList.remove('is-valid', 'is-invalid');
    
    // Validar campo requerido
    if (esRequerido && !valor) {
        marcarCampoInvalido(campo, 'Este campo es obligatorio');
        return false;
    }
    
    // Validaciones específicas por tipo
    if (valor) {
        switch (tipo) {
            case 'email':
                return validarEmail(campo);
            case 'password':
                return validarPassword(campo);
            case 'url':
                return validarURL(campo);
            default:
                if (valor) {
                    marcarCampoValido(campo);
                    return true;
                }
        }
    }
    
    return true;
}

function validarEmail(campo) {
    const email = campo.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        marcarCampoInvalido(campo, 'Ingresa un email válido');
        return false;
    }
    
    if (email) {
        marcarCampoValido(campo);
    }
    return true;
}

function validarPassword(campo) {
    const password = campo.value;
    const minLength = campo.getAttribute('minlength') || VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH;
    
    if (password && password.length < minLength) {
        marcarCampoInvalido(campo, `La contraseña debe tener al menos ${minLength} caracteres`);
        return false;
    }
    
    if (password) {
        marcarCampoValido(campo);
    }
    return true;
}

function validarURL(campo) {
    const url = campo.value.trim();
    const urlRegex = /^https?:\/\/.+/;
    
    if (url && !urlRegex.test(url)) {
        marcarCampoInvalido(campo, 'Ingresa una URL válida');
        return false;
    }
    
    if (url) {
        marcarCampoValido(campo);
    }
    return true;
}

function marcarCampoValido(campo) {
    campo.classList.remove('is-invalid');
    campo.classList.add('is-valid');
    
    const feedback = campo.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.style.display = 'none';
    }
}

function marcarCampoInvalido(campo, mensaje) {
    campo.classList.remove('is-valid');
    campo.classList.add('is-invalid');
    
    let feedback = campo.parentNode.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        campo.parentNode.appendChild(feedback);
    }
    
    feedback.textContent = mensaje;
    feedback.style.display = 'block';
}

function validarFormularioCompleto(formulario) {
    const inputs = formulario.querySelectorAll('.form-control, input, textarea, select');
    let esValido = true;
    
    inputs.forEach(input => {
        if (!validarCampo(input)) {
            esValido = false;
        }
    });
    
    return esValido;
}

// ==================== UTILIDADES DE CONTRASEÑA ====================

function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    const icon = iconElement || document.querySelector(`[data-target="${inputId}"]`);
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function configurarTogglePassword() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            togglePassword(targetId, this.querySelector('i'));
        });
    });
}

// ==================== UTILIDADES GENERALES ====================

function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function formatearFecha(fechaString) {
    if (!fechaString) return 'N/A';
    
    try {
        const fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return 'Fecha inválida';
        
        const ahora = new Date();
        const diferencia = ahora - fecha;
        
        const minutos = Math.floor(diferencia / (1000 * 60));
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        
        const fechaExacta = fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let textoRelativo;
        if (diferencia < 0) {
            textoRelativo = 'En el futuro';
        } else if (minutos < 60) {
            textoRelativo = `Hace ${minutos} min`;
        } else if (horas < 24) {
            textoRelativo = `Hace ${horas}h`;
        } else if (dias < 7) {
            textoRelativo = `Hace ${dias} días`;
        } else {
            textoRelativo = 'Hace más de una semana';
        }
        
        return `
            <div class="fecha-container" title="${fechaExacta}">
                <div class="fecha-relativa">${textoRelativo}</div>
                <div class="fecha-exacta">${fechaExacta}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error parseando fecha:', fechaString, error);
        return 'Error en fecha';
    }
}

function copiarTexto(texto, mostrarNotif = true) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto).then(() => {
            if (mostrarNotif) {
                mostrarNotificacion('Texto copiado al portapapeles', 'success');
            }
        }).catch(err => {
            console.error('Error al copiar:', err);
            if (mostrarNotif) {
                mostrarNotificacion('Error al copiar el texto', 'error');
            }
        });
    } else {
        // Fallback para navegadores sin soporte de clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            if (mostrarNotif) {
                mostrarNotificacion('Texto copiado al portapapeles', 'success');
            }
        } catch (err) {
            console.error('Error al copiar:', err);
            if (mostrarNotif) {
                mostrarNotificacion('Error al copiar el texto', 'error');
            }
        }
        document.body.removeChild(textArea);
    }
}

// ==================== GESTIÓN DE ALERTAS DESDE SESSIONSTORAGE ====================

function procesarAlertasPendientes() {
    const alertMessage = sessionStorage.getItem("alertMessage");
    const alertType = sessionStorage.getItem("alertType");
    
    if (alertMessage && alertType) {
        setTimeout(() => {
            mostrarAlerta(alertMessage, alertType, true);
        }, 200);
        
        sessionStorage.removeItem("alertMessage");
        sessionStorage.removeItem("alertType");
    }
}

// ==================== CONFIGURACIÓN DE TOOLTIPS Y POPOVERS ====================

function configurarTooltips() {
    // Configurar tooltips para elementos con data-bs-toggle="tooltip"
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (window.bootstrap && bootstrap.Tooltip) {
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => 
            new bootstrap.Tooltip(tooltipTriggerEl)
        );
    }
}

function configurarPopovers() {
    // Configurar popovers para elementos con data-bs-toggle="popover"
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    if (window.bootstrap && bootstrap.Popover) {
        const popoverList = [...popoverTriggerList].map(popoverTriggerEl => 
            new bootstrap.Popover(popoverTriggerEl)
        );
    }
}

// ==================== INICIALIZACIÓN ====================

function inicializarUI() {
    console.log('Inicializando módulo UI...');
    
    // Procesar alertas pendientes
    procesarAlertasPendientes();
    
    // Configurar validaciones de formularios
    document.querySelectorAll('form').forEach(form => {
        if (!form.hasAttribute('data-no-validation')) {
            configurarValidacionFormulario(form);
        }
    });
    
    // Configurar toggles de contraseña
    configurarTogglePassword();
    
    // Configurar animaciones
    configurarAnimacionesScroll();
    configurarAnimacionesTarjetas();
    configurarAnimacionesPasos();
    
    // Configurar tooltips y popovers si Bootstrap está disponible
    configurarTooltips();
    configurarPopovers();
    
    console.log('Módulo UI inicializado correctamente');
}

// ==================== FUNCIONES DE COMPATIBILIDAD ====================

// Alias para mantener compatibilidad con script.js
const animateSteps = configurarAnimacionesPasos;
const setupFormValidation = configurarValidacionFormulario;
const togglePasswordLogin = () => togglePassword('password');

// ==================== EXPORTACIÓN ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Alertas
        mostrarAlerta,
        mostrarExito,
        mostrarError,
        mostrarAdvertencia,
        mostrarInfo,
        removerAlerta,
        
        // Notificaciones
        mostrarNotificacion,
        removerNotificacion,
        
        // Confirmaciones
        mostrarConfirmacion,
        confirmarAccion,
        removerModal,
        
        // Loading
        mostrarCargando,
        ocultarCargando,
        mostrarSkeletonLoading,
        ocultarSkeletonLoading,
        
        // Animaciones
        configurarAnimacionesScroll,
        configurarAnimacionesTarjetas,
        configurarAnimacionesPasos,
        animarNumeros,
        
        // Scroll
        scrollToBottom,
        scrollToBottomForzado,
        scrollToElement,
        
        // Validación
        configurarValidacionFormulario,
        validarCampo,
        validarFormularioCompleto,
        
        // Utilidades
        togglePassword,
        debounce,
        throttle,
        escapeHtml,
        formatearFecha,
        copiarTexto,
        
        // Inicialización
        inicializarUI,
        
        // Compatibilidad
        animateSteps,
        setupFormValidation,
        togglePasswordLogin
    };
}

// ==================== AUTO-INICIALIZACIÓN ====================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUI);
} else {
    inicializarUI();
}

console.log('Módulo UI cargado correctamente');