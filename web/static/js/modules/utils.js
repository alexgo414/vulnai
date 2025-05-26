// Utilidades generales y configuración

// ==================== CONFIGURACIÓN GLOBAL ====================
const API_BASE_URL_CHAT = "http://localhost:5002";
const API_BASE_URL = "http://localhost:5001";

// Variables globales
let proyectoActualChat = 'general';
let isInChat = false;

/* ==================== CONSTANTES DE VALIDACIÓN ==================== */
const VALIDATION_CONSTANTS = {
    MIN_PASSWORD_LENGTH: 4,        // Cambiar aquí para toda la app
    MIN_USERNAME_LENGTH: 3,
    MIN_NAME_LENGTH: 2,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME_REGEX: /^[a-zA-Z0-9_.-]+$/
};

// Exportar constantes para uso global
window.VALIDATION_CONSTANTS = VALIDATION_CONSTANTS;


// ==================== UTILIDADES DE FECHAS ====================

function formatearFecha(fechaString) {
    if (!fechaString) return 'N/A';
    
    try {
        const fecha = new Date(fechaString);
        
        if (isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        }
        
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

// Función para formatear fecha simple (sin HTML)
function formatearFechaSimple(fechaString) {
    if (!fechaString) return 'N/A';
    
    try {
        const fecha = new Date(fechaString);
        if (isNaN(fecha.getTime())) return 'Fecha inválida';
        
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Error en fecha';
    }
}

// ==================== UTILIDADES DE TEXTO ====================

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

function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitalizeWords(text) {
    if (!text) return '';
    return text.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// ==================== UTILIDADES DE VALIDACIÓN ====================

function validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validarURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function validarPassword(password, minLength = VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH) {
    return password && password.length >= minLength;
}

function validarUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    return username && username.length >= 3 && usernameRegex.test(username);
}

function validarNombre(nombre) {
    return nombre && nombre.trim().length >= 2;
}

// ==================== UTILIDADES DE ARRAYS Y OBJETOS ====================

function groupBy(array, key) {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
}

function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
        const bVal = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
        
        if (direction === 'desc') {
            return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
    });
}

function uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

function isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    return Object.keys(obj).length === 0;
}

// ==================== UTILIDADES DE NÚMEROS ====================

function formatNumber(num, decimals = 0) {
    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ==================== UTILIDADES DE DOM ====================

function createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

function removeElement(selector) {
    const element = typeof selector === 'string' ? 
        document.querySelector(selector) : selector;
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

function toggleClass(element, className) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.classList.toggle(className);
    }
}

function hasClass(element, className) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    return element ? element.classList.contains(className) : false;
}

// ==================== UTILIDADES DE SCROLL ====================

function scrollToTop(behavior = 'smooth') {
    window.scrollTo({
        top: 0,
        behavior: behavior
    });
}

function scrollToElement(selector, offset = 0, behavior = 'smooth') {
    const element = typeof selector === 'string' ? 
        document.querySelector(selector) : selector;
    
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: behavior
        });
    }
}

function scrollToBottom(container, behavior = 'smooth') {
    if (!container) return;
    
    if (behavior === 'smooth') {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        container.scrollTop = container.scrollHeight;
    }
}

function scrollToBottomForzado(container) {
    if (!container) {
        container = document.querySelector('.chat-mensajes');
    }
    
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

function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ==================== UTILIDADES DE PERFORMANCE ====================

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

function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

// ==================== UTILIDADES DE ALMACENAMIENTO ====================

function setStorageItem(key, value, type = 'localStorage') {
    try {
        const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error setting storage item:', error);
        return false;
    }
}

function getStorageItem(key, defaultValue = null, type = 'localStorage') {
    try {
        const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
        const item = storage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error getting storage item:', error);
        return defaultValue;
    }
}

function removeStorageItem(key, type = 'localStorage') {
    try {
        const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
        storage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing storage item:', error);
        return false;
    }
}

function clearStorage(type = 'localStorage') {
    try {
        const storage = type === 'sessionStorage' ? sessionStorage : localStorage;
        storage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

// ==================== UTILIDADES DE CLIPBOARD ====================

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback para navegadores sin soporte de clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            return result;
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
    }
}

async function readFromClipboard() {
    try {
        if (navigator.clipboard) {
            return await navigator.clipboard.readText();
        }
        return null;
    } catch (error) {
        console.error('Error reading from clipboard:', error);
        return null;
    }
}

// ==================== UTILIDADES DE URL ====================

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

function getPathSegments() {
    return window.location.pathname.split('/').filter(segment => segment !== '');
}

function getCurrentPage() {
    const segments = getPathSegments();
    return segments[segments.length - 1] || 'home';
}

// ==================== UTILIDADES DE TIEMPO ====================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    const intervals = {
        año: 31536000,
        mes: 2592000,
        semana: 604800,
        día: 86400,
        hora: 3600,
        minuto: 60
    };
    
    for (let [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds);
        if (interval >= 1) {
            return `hace ${interval} ${unit}${interval > 1 ? 's' : ''}`;
        }
    }
    
    return 'hace un momento';
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ==================== UTILIDADES DE DISPOSITIVO ====================

function isMobile() {
    return window.innerWidth <= 768;
}

function isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

function isDesktop() {
    return window.innerWidth > 1024;
}

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function getDeviceType() {
    if (isMobile()) return 'mobile';
    if (isTablet()) return 'tablet';
    return 'desktop';
}

// ==================== UTILIDADES DE RED ====================

function isOnline() {
    return navigator.onLine;
}

function getConnectionSpeed() {
    return navigator.connection ? navigator.connection.effectiveType : 'unknown';
}

// ==================== SISTEMA DE ALERTAS HEREDADO ====================

function mostrarAlerta(mensaje, tipo = "info", flotante = false) {
    const container = document.getElementById("container-alert");
    const isInChatLocal = document.querySelector('.chat-container') !== null;

    const categoryMap = {
        success: "Éxito",
        danger: "Error",
        warning: "Advertencia",
        info: "Información"
    };
    const titulo = categoryMap[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);

    const alertHTML = `
        <div class="alert alert-dismissible alert-${tipo} ${flotante ? 'alert-floating auto-hide' : ''}">
            <div class="alert-content">
                <div>
                    <h4 class="alert-heading">${titulo}</h4>
                    <p>${mensaje}</p>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    if (flotante || isInChatLocal) {
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = alertHTML;
        const alertElement = alertDiv.firstElementChild;
        
        if (isInChatLocal) {
            const chatContainer = document.querySelector('.chat-container');
            chatContainer.appendChild(alertElement);
        } else {
            document.body.appendChild(alertElement);
        }
        
        setTimeout(() => {
            if (alertElement && alertElement.parentNode) {
                alertElement.style.animation = 'chatAlertSlideOut 0.5s ease-in';
                setTimeout(() => {
                    if (alertElement.parentNode) {
                        alertElement.remove();
                    }
                }, 500);
            }
        }, 4000);
        
        alertElement.addEventListener('click', () => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        });
        
    } else if (container) {
        container.innerHTML = alertHTML;
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function mostrarExito(mensaje) {
    mostrarAlerta(mensaje, 'success', true);
}

function mostrarError(mensaje) {
    mostrarAlerta(mensaje, 'danger', true);
}

function mostrarAdvertencia(mensaje) {
    mostrarAlerta(mensaje, 'warning', true);
}

function mostrarInfo(mensaje) {
    mostrarAlerta(mensaje, 'info', true);
}

function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.className = `mini-notification ${tipo}`;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 100);
    
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ==================== UTILIDADES DE AUTENTICACIÓN ====================

async function verificarAutenticacion() {
    try {
        const response = await fetch(`${API_BASE_URL}/verificar-auth`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        return false;
    }
}

function limpiarSesion() {
    sessionStorage.clear();
    localStorage.clear();
}

function obtenerUsuarioActual() {
    return getStorageItem('usuarioActual', null, 'sessionStorage');
}

function guardarUsuarioActual(usuario) {
    return setStorageItem('usuarioActual', usuario, 'sessionStorage');
}

// ==================== UTILIDADES DE FORMULARIOS ====================

function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

function resetForm(form) {
    if (typeof form === 'string') {
        form = document.querySelector(form);
    }
    
    if (form) {
        form.reset();
        
        // Limpiar clases de validación
        form.querySelectorAll('.is-valid, .is-invalid').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
        
        // Ocultar mensajes de feedback
        form.querySelectorAll('.invalid-feedback, .valid-feedback').forEach(feedback => {
            feedback.style.display = 'none';
        });
    }
}

function enableForm(form) {
    if (typeof form === 'string') {
        form = document.querySelector(form);
    }
    
    if (form) {
        form.querySelectorAll('input, textarea, select, button').forEach(field => {
            field.disabled = false;
        });
    }
}

function disableForm(form) {
    if (typeof form === 'string') {
        form = document.querySelector(form);
    }
    
    if (form) {
        form.querySelectorAll('input, textarea, select, button').forEach(field => {
            field.disabled = true;
        });
    }
}

// ==================== UTILIDADES DE LOADING ====================

function mostrarCargandoFormulario(button, loading = true, texto = 'Cargando...') {
    if (typeof button === 'string') {
        button = document.querySelector(button);
    }
    
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${texto}
        `;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

// ==================== UTILIDADES DE ERROR ====================

function handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    
    let mensaje = 'Ha ocurrido un error inesperado';
    
    if (error.message) {
        mensaje = error.message;
    } else if (typeof error === 'string') {
        mensaje = error;
    }
    
    mostrarError(mensaje);
    
    // Log para debugging
    if (window.location.hostname === 'localhost') {
        console.trace(error);
    }
}

// ==================== UTILIDADES DE DETECCIÓN ====================

function detectarContexto() {
    isInChat = document.querySelector('.chat-container') !== null;
    
    // Actualizar variable global del proyecto actual
    const proyectoGuardado = getStorageItem('proyectoActualChat');
    if (proyectoGuardado) {
        proyectoActualChat = proyectoGuardado;
    }
    
    return {
        isInChat,
        proyectoActual: proyectoActualChat,
        currentPage: getCurrentPage(),
        deviceType: getDeviceType()
    };
}

// ==================== INICIALIZACIÓN Y EXPORTACIÓN ====================

// Función de inicialización
function inicializarUtils() {
    console.log('Inicializando módulo Utils...');
    
    // Detectar contexto
    detectarContexto();
    
    // Configurar eventos globales
    window.addEventListener('resize', debounce(() => {
        const newDeviceType = getDeviceType();
        document.body.setAttribute('data-device', newDeviceType);
    }, 250));
    
    // Detectar cambios en la conectividad
    window.addEventListener('online', () => {
        mostrarExito('Conexión restaurada');
    });
    
    window.addEventListener('offline', () => {
        mostrarAdvertencia('Sin conexión a internet');
    });
    
    console.log('Módulo Utils inicializado correctamente');
}

// Exportación para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Configuración
        API_BASE_URL,
        API_BASE_URL_CHAT,
        proyectoActualChat,
        
        // Fechas
        formatearFecha,
        formatearFechaSimple,
        timeAgo,
        formatDuration,
        
        // Texto
        escapeHtml,
        truncateText,
        slugify,
        capitalizeFirst,
        capitalizeWords,
        
        // Validación
        validarEmail,
        validarURL,
        validarPassword,
        validarUsername,
        validarNombre,
        
        // Arrays y objetos
        groupBy,
        sortBy,
        uniqueBy,
        isEmpty,
        
        // Números
        formatNumber,
        randomBetween,
        clamp,
        
        // DOM
        createElement,
        removeElement,
        toggleClass,
        hasClass,
        
        // Scroll
        scrollToTop,
        scrollToElement,
        scrollToBottom,
        scrollToBottomForzado,
        isElementInViewport,
        
        // Performance
        debounce,
        throttle,
        memoize,
        
        // Storage
        setStorageItem,
        getStorageItem,
        removeStorageItem,
        clearStorage,
        
        // Clipboard
        copyToClipboard,
        readFromClipboard,
        
        // URL
        getQueryParam,
        setQueryParam,
        removeQueryParam,
        getPathSegments,
        getCurrentPage,
        
        // Tiempo
        sleep,
        
        // Dispositivo
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        getDeviceType,
        
        // Red
        isOnline,
        getConnectionSpeed,
        
        // Alertas
        mostrarAlerta,
        mostrarExito,
        mostrarError,
        mostrarAdvertencia,
        mostrarInfo,
        mostrarNotificacion,
        
        // Autenticación
        verificarAutenticacion,
        limpiarSesion,
        obtenerUsuarioActual,
        guardarUsuarioActual,
        
        // Formularios
        serializeForm,
        resetForm,
        enableForm,
        disableForm,
        mostrarCargandoFormulario,
        
        // Error handling
        handleError,
        
        // Detección
        detectarContexto,
        
        // Inicialización
        inicializarUtils
    };
}

// ==================== AUTO-INICIALIZACIÓN ====================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarUtils);
} else {
    inicializarUtils();
}

console.log('Módulo Utils cargado correctamente');