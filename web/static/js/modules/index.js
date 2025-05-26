/* INDEX.JS - Funcionalidades específicas para la página de inicio */

console.log("📄 Módulo Index cargado");

// ==================== VARIABLES GLOBALES DEL INDEX ====================

let heroAnimationsInitialized = false;
let scrollAnimationsActive = false;

// ==================== CONFIGURACIÓN DE ANIMACIONES ====================

const INDEX_CONFIG = {
    hero: {
        particleSpeed: 20,
        waveSpeed: 15,
        floatDuration: 6,
        typingSpeed: 100
    },
    scroll: {
        parallaxSpeed: 0.5,
        threshold: 0.1,
        rootMargin: '0px 0px -10% 0px'
    },
    stats: {
        animationDuration: 2000,
        incrementDelay: 50
    },
    pricing: {
        toggleDuration: 300
    }
};

// ==================== INICIALIZACIÓN PRINCIPAL ====================

/**
 * Función principal para inicializar todas las funcionalidades del index
 */
function inicializarIndex() {
    console.log("🎨 Inicializando página de inicio...");
    
    try {
        // 1. Verificar que estamos en la página correcta
        if (!esPageHome()) {
            console.log("No estamos en la página de inicio, saltando inicialización");
            return;
        }
        
        // 2. Inicializar componentes en orden
        inicializarHeroSection();
        inicializarTogglePrecios();
        inicializarAnimacionesScroll();
        inicializarScrollSuave();
        inicializarMicrointeracciones();
        inicializarContadoresAnimados();
        
        // 3. Marcar como inicializado
        heroAnimationsInitialized = true;
        scrollAnimationsActive = true;
        
        console.log("✅ Página de inicio inicializada correctamente");
        
    } catch (error) {
        console.error("❌ Error inicializando página de inicio:", error);
        
        if (typeof handleError === 'function') {
            handleError(error, 'Inicialización del index');
        }
    }
}

// ==================== HERO SECTION ====================

/**
 * Inicializa todas las animaciones del hero section
 */
function inicializarHeroSection() {
    console.log("🦸 Inicializando Hero Section...");
    
    // Inicializar partículas animadas
    inicializarParticulas();
    
    // Inicializar ondas
    inicializarOndas();
    
    // Inicializar chat preview
    inicializarChatPreview();
    
    // Inicializar elementos flotantes
    inicializarElementosFlotantes();
    
    // Inicializar indicador de scroll
    inicializarIndicadorScroll();
}

/**
 * Configura las partículas del fondo del hero
 */
function inicializarParticulas() {
    const particles = document.querySelector('.hero-particles');
    if (!particles) return;
    
    // Animación personalizada de partículas
    particles.style.animationDuration = `${INDEX_CONFIG.hero.particleSpeed}s`;
    
    // Agregar partículas adicionales si es necesario
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255,255,255,0.${Math.floor(Math.random() * 5) + 1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particleFloat ${Math.random() * 10 + 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        particles.appendChild(particle);
    }
}

/**
 * Configura las ondas animadas del hero
 */
function inicializarOndas() {
    const waves = document.querySelectorAll('.wave');
    if (!waves.length) return;
    
    waves.forEach((wave, index) => {
        wave.style.animationDuration = `${INDEX_CONFIG.hero.waveSpeed + (index * 2)}s`;
        wave.style.animationDelay = `${-5 * index}s`;
    });
}

/**
 * Inicializa el preview del chat en el hero
 */
function inicializarChatPreview() {
    const chatPreview = document.querySelector('.chat-preview');
    if (!chatPreview) return;
    
    // Simular typing indicator
    setTimeout(() => {
        simularEscritura();
    }, 2000);
    
    // Repetir cada 10 segundos
    setInterval(() => {
        simularEscritura();
    }, 10000);
}

/**
 * Simula el efecto de escritura en el chat
 */
function simularEscritura() {
    const typingIndicator = document.querySelector('.typing-indicator');
    const aiMessage = document.querySelector('.ai-message');
    
    if (!typingIndicator || !aiMessage) return;
    
    // Mostrar typing indicator
    typingIndicator.style.display = 'flex';
    aiMessage.style.opacity = '0.5';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        typingIndicator.style.display = 'none';
        aiMessage.style.opacity = '1';
        
        // Efecto de "nuevo mensaje"
        aiMessage.style.transform = 'scale(1.05)';
        setTimeout(() => {
            aiMessage.style.transform = 'scale(1)';
        }, 200);
        
    }, 3000);
}

/**
 * Configura los elementos flotantes decorativos
 */
function inicializarElementosFlotantes() {
    const elementos = document.querySelectorAll('.floating-element');
    if (!elementos.length) return;
    
    elementos.forEach((elemento, index) => {
        elemento.style.animationDuration = `${INDEX_CONFIG.hero.floatDuration + (index * 2)}s`;
        elemento.style.animationDelay = `${-2 * index}s`;
        
        // Agregar interactividad al hover
        elemento.addEventListener('mouseenter', () => {
            elemento.style.animationPlayState = 'paused';
            elemento.style.transform = 'scale(1.2)';
        });
        
        elemento.addEventListener('mouseleave', () => {
            elemento.style.animationPlayState = 'running';
            elemento.style.transform = 'scale(1)';
        });
    });
}

/**
 * Configura el indicador de scroll
 */
function inicializarIndicadorScroll() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (!scrollIndicator) return;
    
    scrollIndicator.addEventListener('click', () => {
        const featuresSection = document.querySelector('#features');
        if (featuresSection) {
            featuresSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
    
    // Ocultar cuando se hace scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollIndicator.style.opacity = window.pageYOffset > 100 ? '0' : '1';
        
        scrollTimeout = setTimeout(() => {
            if (window.pageYOffset > 100) {
                scrollIndicator.style.display = 'none';
            } else {
                scrollIndicator.style.display = 'block';
            }
        }, 300);
    });
}

// ==================== TOGGLE DE PRECIOS ====================

/**
 * Inicializa el toggle de precios mensual/anual
 */
function inicializarTogglePrecios() {
    console.log("💰 Inicializando toggle de precios...");
    
    const toggle = document.getElementById('pricing-toggle');
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const annualPrices = document.querySelectorAll('.annual-price');
    
    if (!toggle) {
        console.log("Toggle de precios no encontrado");
        return;
    }
    
    toggle.addEventListener('change', function() {
        const isAnnual = this.checked;
        
        // Animación de transición
        document.querySelectorAll('.plan-price').forEach(priceContainer => {
            priceContainer.style.transform = 'scale(0.9)';
            priceContainer.style.opacity = '0.7';
        });
        
        setTimeout(() => {
            if (isAnnual) {
                // Mostrar precios anuales
                monthlyPrices.forEach(price => {
                    price.classList.add('hidden');
                    price.style.display = 'none';
                });
                annualPrices.forEach(price => {
                    price.classList.remove('hidden');
                    price.style.display = 'inline';
                });
            } else {
                // Mostrar precios mensuales
                monthlyPrices.forEach(price => {
                    price.classList.remove('hidden');
                    price.style.display = 'inline';
                });
                annualPrices.forEach(price => {
                    price.classList.add('hidden');
                    price.style.display = 'none';
                });
            }
            
            // Restaurar animación
            document.querySelectorAll('.plan-price').forEach(priceContainer => {
                priceContainer.style.transform = 'scale(1)';
                priceContainer.style.opacity = '1';
            });
            
        }, INDEX_CONFIG.pricing.toggleDuration / 2);
    });
    
    console.log("✅ Toggle de precios configurado");
}

// ==================== ANIMACIONES DE SCROLL ====================

/**
 * Inicializa las animaciones que se activan con el scroll
 */
function inicializarAnimacionesScroll() {
    console.log("🎭 Inicializando animaciones de scroll...");
    
    // Configurar Intersection Observer para animaciones
    const observerOptions = {
        threshold: INDEX_CONFIG.scroll.threshold,
        rootMargin: INDEX_CONFIG.scroll.rootMargin
    };
    
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animarElemento(entry.target);
                
                // Dejar de observar el elemento después de animarlo
                scrollObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Aplicar a elementos con data-aos
    document.querySelectorAll('[data-aos]').forEach(el => {
        prepararElementoParaAnimacion(el);
        scrollObserver.observe(el);
    });
    
    // Inicializar parallax
    inicializarParallax();
    
    console.log("✅ Animaciones de scroll configuradas");
}

/**
 * Prepara un elemento para ser animado
 */
function prepararElementoParaAnimacion(elemento) {
    const animationType = elemento.getAttribute('data-aos');
    const delay = elemento.getAttribute('data-aos-delay') || 0;
    
    elemento.style.opacity = '0';
    elemento.style.transition = `all 0.6s ease-out ${delay}ms`;
    
    switch (animationType) {
        case 'fade-up':
            elemento.style.transform = 'translateY(30px)';
            break;
        case 'fade-down':
            elemento.style.transform = 'translateY(-30px)';
            break;
        case 'fade-left':
            elemento.style.transform = 'translateX(30px)';
            break;
        case 'fade-right':
            elemento.style.transform = 'translateX(-30px)';
            break;
        default:
            elemento.style.transform = 'translateY(20px)';
    }
}

/**
 * Anima un elemento cuando entra en el viewport
 */
function animarElemento(elemento) {
    elemento.style.opacity = '1';
    elemento.style.transform = 'translateY(0) translateX(0)';
    
    // Agregar clase para animaciones CSS adicionales
    elemento.classList.add('aos-animate');
}

/**
 * Inicializa efectos parallax
 */
function inicializarParallax() {
    if (!scrollAnimationsActive) return;
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        
        // Parallax del hero background
        const heroBackground = document.querySelector('.hero-background');
        if (heroBackground) {
            heroBackground.style.transform = `translateY(${scrolled * INDEX_CONFIG.scroll.parallaxSpeed}px)`;
        }
        
        // Parallax de elementos flotantes
        const floatingElements = document.querySelectorAll('.floating-element');
        floatingElements.forEach((element, index) => {
            const speed = (index + 1) * 0.1;
            element.style.transform += ` translateY(${scrolled * speed}px)`;
        });
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick, { passive: true });
}

// ==================== SCROLL SUAVE ====================

/**
 * Configura el scroll suave entre secciones
 */
function inicializarScrollSuave() {
    console.log("🌊 Inicializando scroll suave...");
    
    // Enlaces de navegación suave
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            if (href === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Actualizar URL sin scroll
                history.pushState(null, null, href);
            }
        });
    });
    
    console.log("✅ Scroll suave configurado");
}

// ==================== MICROINTERACCIONES ====================

/**
 * Inicializa microinteracciones y efectos hover
 */
function inicializarMicrointeracciones() {
    console.log("✨ Inicializando microinteracciones...");
    
    // Hover effects en cards
    document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
            card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            const isFeatured = card.classList.contains('featured');
            card.style.transform = isFeatured ? 'scale(1.05)' : 'translateY(0) scale(1)';
            card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
        });
    });
    
    // Efecto ripple en botones
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255,255,255,0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Efecto hover en iconos
    document.querySelectorAll('.feature-icon, .plan-icon').forEach(icon => {
        icon.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1) rotate(0deg)';
        });
    });
    
    console.log("✅ Microinteracciones configuradas");
}

// ==================== CONTADORES ANIMADOS ====================

/**
 * Inicializa los contadores animados de estadísticas
 */
function inicializarContadoresAnimados() {
    console.log("🔢 Inicializando contadores animados...");
    
    const observerOptions = {
        threshold: 0.5
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animarContador(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar estadísticas del hero
    document.querySelectorAll('.stat-number').forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // Observar anillo de progreso si existe
    const progressRing = document.querySelector('.progress-ring-circle');
    if (progressRing) {
        statsObserver.observe(progressRing.closest('.progress-ring'));
        configurarAnilloProgreso(progressRing);
    }
    
    console.log("✅ Contadores animados configurados");
}

/**
 * Anima un contador de estadísticas
 */
function animarContador(statElement) {
    const finalValueText = statElement.textContent;
    const finalValue = parseInt(finalValueText.replace(/[^\d]/g, ''));
    const suffix = finalValueText.replace(/[\d]/g, '');
    
    let currentValue = 0;
    const increment = finalValue / (INDEX_CONFIG.stats.animationDuration / INDEX_CONFIG.stats.incrementDelay);
    
    const timer = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= finalValue) {
            currentValue = finalValue;
            clearInterval(timer);
        }
        
        statElement.textContent = Math.floor(currentValue) + suffix;
        
        // Efecto de escalado durante la animación
        const progress = currentValue / finalValue;
        const scale = 0.8 + (progress * 0.2);
        statElement.style.transform = `scale(${scale})`;
        
    }, INDEX_CONFIG.stats.incrementDelay);
    
    // Restaurar escala al final
    setTimeout(() => {
        statElement.style.transform = 'scale(1)';
    }, INDEX_CONFIG.stats.animationDuration);
}

/**
 * Configura el anillo de progreso
 */
function configurarAnilloProgreso(progressRing) {
    const radius = progressRing.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;
    
    // Animar cuando sea visible
    setTimeout(() => {
        const progress = 87; // 87%
        const offset = circumference - progress / 100 * circumference;
        progressRing.style.strokeDashoffset = offset;
        progressRing.style.transition = 'stroke-dashoffset 2s ease-in-out';
    }, 500);
}

// ==================== NAVBAR MODERNO ====================

/**
 * Inicializa la funcionalidad de la navbar moderna
 */
function inicializarNavbarModerno() {
    console.log("🧭 Inicializando navbar moderno...");
    
    // Efecto de scroll en navbar
    inicializarScrollNavbar();
    
    // Indicador de progreso de scroll
    inicializarScrollProgress();
    
    // Efectos hover mejorados
    inicializarEfectosNavbar();
    
    console.log("✅ Navbar moderno configurado");
}

/**
 * Configura el efecto de scroll en el navbar
 */
function inicializarScrollNavbar() {
    const navbar = document.getElementById('navbar-principal');
    if (!navbar) return;
    
    let lastScrollTop = 0;
    let isScrolled = false;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Agregar clase scrolled
        if (scrollTop > 100 && !isScrolled) {
            navbar.classList.add('scrolled');
            isScrolled = true;
        } else if (scrollTop <= 100 && isScrolled) {
            navbar.classList.remove('scrolled');
            isScrolled = false;
        }
        
        // Auto-hide navbar en scroll down (opcional)
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            // Scrolling down
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    }, { passive: true });
}

/**
 * Configura el indicador de progreso de scroll
 */
function inicializarScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;
    
    // Solo mostrar en página de inicio
    if (!esPageHome()) {
        progressBar.style.display = 'none';
        return;
    }
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        progressBar.style.width = Math.min(scrollPercent, 100) + '%';
    }, { passive: true });
}

/**
 * Configura efectos adicionales del navbar
 */
function inicializarEfectosNavbar() {
    // Efecto de hover mejorado en nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', (e) => {
        const dropdowns = document.querySelectorAll('.dropdown-menu.show');
        dropdowns.forEach(dropdown => {
            if (!dropdown.closest('.dropdown').contains(e.target)) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown.previousElementSibling);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }
        });
    });
}

// CORREGIR: Definir la función que falta
function esPageHome() {
    return window.location.pathname === '/' || window.location.pathname === '/index';
}

// Agregar a la función principal de inicialización del index
function inicializarIndex() {
    console.log("🎨 Inicializando página de inicio...");
    
    try {
        // Verificar que estamos en la página correcta
        if (!esPageHome()) {
            console.log("No estamos en la página de inicio, saltando inicialización");
            return;
        }
        
        // Inicializar navbar moderno (también en otras páginas)
        inicializarNavbarModerno();
        
        // Resto de inicializaciones...
        inicializarHeroSection();
        inicializarTogglePrecios();
        inicializarAnimacionesScroll();
        inicializarScrollSuave();
        inicializarMicrointeracciones();
        inicializarContadoresAnimados();
        
        heroAnimationsInitialized = true;
        scrollAnimationsActive = true;
        
        console.log("✅ Página de inicio inicializada correctamente");
        
    } catch (error) {
        console.error("❌ Error inicializando página de inicio:", error);
        
        if (typeof handleError === 'function') {
            handleError(error, 'Inicialización del index');
        }
    }
}

// También inicializar navbar en todas las páginas
document.addEventListener('DOMContentLoaded', () => {
    inicializarNavbarModerno();
});

// ==================== EVENT LISTENERS ====================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (esPageHome()) {
        inicializarIndex();
    }
});

// Manejar redimensionamiento
window.addEventListener('resize', redimensionarIndex);

// Limpiar cuando se navega fuera de la página
window.addEventListener('beforeunload', limpiarIndex);

// ==================== EXPORTAR FUNCIONES ====================

// Hacer funciones disponibles globalmente si es necesario
window.inicializarIndex = inicializarIndex;
window.limpiarIndex = limpiarIndex;
window.esPageHome = esPageHome;

// ==================== CSS ADICIONAL PARA ANIMACIONES ====================

// Agregar estilos CSS dinámicamente si no están en el CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .aos-animate {
        transition-delay: 0ms !important;
    }
    
    .particle {
        pointer-events: none;
        z-index: 1;
    }
    
    .stat-number {
        transition: transform 0.1s ease-out;
    }
    
    .floating-element {
        transition: transform 0.3s ease-out;
    }
    
    .hero-background {
        will-change: transform;
    }
    
    .progress-ring-circle {
        transition: stroke-dashoffset 2s ease-in-out;
    }
`;
document.head.appendChild(style);

console.log("✅ Módulo Index completamente cargado");