export function guardarAlertaParaSiguientePagina(mensaje, tipo = "info") {
    sessionStorage.setItem("alertMessage", mensaje);
    sessionStorage.setItem("alertType", tipo);
}

export function mostrarAlertaGuardada() {
    const mensaje = sessionStorage.getItem("alertMessage");
    const tipo = sessionStorage.getItem("alertType");
    
    if (mensaje && tipo) {
        // Mostrar como toast flotante
        mostrarToast(mensaje, tipo);
        
        // Limpiar del storage para que no se muestre de nuevo
        sessionStorage.removeItem("alertMessage");
        sessionStorage.removeItem("alertType");
    }
}

export function mostrarAlerta(mensaje, tipo = "info") {
    const container = document.getElementById("container-alert");
    
    // Si no hay contenedor o estamos en transición, usar toast
    if (!container || window.location.hash === '#redirect') {
        mostrarToast(mensaje, tipo);
        return;
    }

    // Mapeo de títulos por tipo
    const categoryMap = {
        success: "Éxito",
        danger: "Error",
        warning: "Advertencia",
        info: "Información"
    };
    const titulo = categoryMap[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);

    container.innerHTML = `
        <div class="alert alert-dismissible alert-${tipo} mt-3">
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            <h4 class="alert-heading">${titulo}</h4>
            <p class="mb-0">${mensaje}</p>
        </div>
    `;
}

export function mostrarToast(mensaje, tipo = "info", duracion = 5000) {
    // Crear contenedor de toasts si no existe
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = "toast-container";
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
    }

    // Configuración de iconos y colores por tipo
    const toastConfig = {
        success: { 
            icon: "fas fa-check-circle", 
            bgClass: "toast-success",
            title: "Éxito" 
        },
        danger: { 
            icon: "fas fa-exclamation-circle", 
            bgClass: "toast-danger",
            title: "Error" 
        },
        warning: { 
            icon: "fas fa-exclamation-triangle", 
            bgClass: "toast-warning",
            title: "Advertencia" 
        },
        info: { 
            icon: "fas fa-info-circle", 
            bgClass: "toast-info",
            title: "Información" 
        }
    };
    
    const config = toastConfig[tipo] || toastConfig.info;

    // Crear el toast
    const toast = document.createElement('div');
    toast.className = `toast-item ${config.bgClass}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <i class="${config.icon}"></i>
            </div>
            <div class="toast-body">
                <div class="toast-title">${config.title}</div>
                <div class="toast-message">${mensaje}</div>
            </div>
            <button class="toast-close" type="button" aria-label="Cerrar">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    // Añadir al contenedor
    toastContainer.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);

    // Configurar barra de progreso
    const progressBar = toast.querySelector('.toast-progress-bar');
    if (progressBar) {
        progressBar.style.animationDuration = `${duracion}ms`;
        progressBar.classList.add('toast-progress-active');
    }

    // Función para cerrar toast
    const cerrarToast = () => {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
            // Limpiar contenedor si está vacío
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    };

    // Auto-cerrar después de la duración especificada
    const timeoutId = setTimeout(cerrarToast, duracion);

    // Cerrar al hacer click en el botón X
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        cerrarToast();
    });

    // Pausar auto-cierre al hacer hover
    toast.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        progressBar.style.animationPlayState = 'paused';
    });

    // Reanudar auto-cierre al quitar hover
    toast.addEventListener('mouseleave', () => {
        const remainingTime = 2000; // 2 segundos adicionales
        progressBar.style.animationPlayState = 'running';
        setTimeout(cerrarToast, remainingTime);
    });

    // Cerrar al hacer click en el toast (opcional)
    toast.addEventListener('click', (e) => {
        if (!e.target.closest('.toast-close')) {
            clearTimeout(timeoutId);
            cerrarToast();
        }
    });
}