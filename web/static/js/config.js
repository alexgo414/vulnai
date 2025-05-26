// ==================== CONFIGURACIÓN GLOBAL ====================
window.APP_CONFIG = {
    API_BASE_URL: 'http://localhost:5001',
    CHAT_API_URL: 'http://localhost:5002',
    WEB_BASE_URL: 'http://localhost:5000',
    
    // Configuraciones de validación
    MIN_PASSWORD_LENGTH: 6,
    MIN_USERNAME_LENGTH: 3,
    
    // Configuraciones de UI
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300
};

console.log('Configuración global cargada:', window.APP_CONFIG);