console.log("¡script.js cargado!");

function scrollToBottom(container) {
    const lastChild = container.lastElementChild;
    if (lastChild) {
        lastChild.scrollIntoView({ behavior: 'smooth',  block: 'nearest' });
    }
}

function animateSteps() {
    // Animation configuration - adjust these values to control speed
    const config = {
        transitionDuration: '2s',    // Duration of each element's animation (longer = slower)
        transitionDelay: '0.8s',     // Delay before animation starts for each element
        delayBetweenSteps: 2000,     // Time between each step starting (milliseconds)
        easing: 'ease-out'           // Animation style: ease, linear, ease-in, ease-out, etc.
    };
    
    let animationDelay = 0;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add visible class to the main step container after delay
                setTimeout(() => {
                    entry.target.classList.add('step-visible');
                    
                    // Get all elements that need animation inside this step
                    const elementsToAnimate = entry.target.querySelectorAll('.step-header, .step-title, .step-text, .step-image');
                    
                    // Apply transition styles and add visible class to each element
                    elementsToAnimate.forEach((el, index) => {
                        // Apply custom transition styles
                        el.style.transition = `opacity ${config.transitionDuration} ${config.easing} ${config.transitionDelay}, 
                                             transform ${config.transitionDuration} ${config.easing} ${config.transitionDelay}`;
                        
                        // Stagger the animations of inner elements slightly
                        setTimeout(() => {
                            el.classList.add('step-visible');
                        }, index * 200); // Slight delay between elements within the same step
                    });
                }, animationDelay);
                
                // Increase delay for next step
                animationDelay += config.delayBetweenSteps;
                
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.2,  // Trigger when 20% of the element is visible
        rootMargin: '0px 0px -10% 0px' // Slightly above the bottom of viewport
    });

    // Apply initial styles and observe all steps
    document.querySelectorAll('.step').forEach(step => {
        // Add base transition styles to the container
        step.style.transition = `opacity ${config.transitionDuration} ${config.easing}, 
                               transform ${config.transitionDuration} ${config.easing}`;
                               
        // Start observing
        observer.observe(step);
    });
    
    // Optional: Reset animation when scrolling back up
    window.addEventListener('scroll', () => {
        if (window.scrollY < 300) { // Near the top of the page
            animationDelay = 0; // Reset delay counter
        }
    });

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
};

function configurarChat(chatMensajes, messageInput, sendButton) {
    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            // Añadir mensaje del usuario
            const userMessage = document.createElement('div');
            userMessage.classList.add('campo-usuario');
            userMessage.innerHTML = `
                <div class="mensaje-usuario">
                    <p class="my-2">${messageText}</p>
                </div>
                <div class="icono-usuario">
                    <i class="fas fa-user icono-user"></i>
                </div>
            `;
            chatMensajes.appendChild(userMessage);

            // Limpiar el input
            messageInput.value = '';

            // Hacer scroll al final
            scrollToBottom(chatMensajes);

            // Enviar mensaje al servidor y mostrar respuesta
            sendMessageToServer(messageText, chatMensajes);
        }
    });
}

function configurarEnvioConEnter(messageInput, sendButton) {
    // Enviar mensaje con la tecla Enter
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });
}

// Base URL del chat
const API_BASE_URL_CHAT = "http://localhost:5002";
// Base URL de la API
const API_BASE_URL = "http://localhost:5001";

// ✅ CONFIGURACIÓN ESTÁNDAR PARA FETCH CON COOKIES
const fetchConfig = {
    credentials: 'include',  // ¡IMPORTANTE! Incluir cookies
    headers: {
        'Content-Type': 'application/json'
    }
};

// ✅ FUNCIÓN HELPER PARA FETCH CON COOKIES
async function fetchWithCredentials(url, options = {}) {
    const config = {
        ...fetchConfig,
        ...options,
        headers: {
            ...fetchConfig.headers,
            ...(options.headers || {})
        }
    };
    
    return fetch(url, config);
}

// ✅ CHAT CON DEBUG DETALLADO
async function sendMessageToServer(messageText, chatMensajes) {
    try {
        console.log("🚀 Enviando mensaje autenticado:", messageText);
        
        // ✅ DEBUG: Verificar cookies antes del envío
        console.log("🍪 Cookies disponibles:", document.cookie);
        
        // ✅ DEBUG: Verificar autenticación previa
        console.log("🔍 Verificando autenticación previa...");
        const authTest = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        console.log("🔐 Test de autenticación:", authTest.status, authTest.ok ? "✅ OK" : "❌ FAIL");
        
        if (!authTest.ok) {
            console.log("❌ Falló test de autenticación previo");
            mostrarAlerta("Tu sesión ha expirado. Serás redirigido al login.", "danger");
            sessionStorage.clear();
            window.location.href = "/login";
            return;
        }
        
        console.log("📡 Enviando mensaje al chat...");
        const response = await fetchWithCredentials(`${API_BASE_URL_CHAT}/chat/mensajes`, {
            method: 'POST',
            body: JSON.stringify({ message: messageText })
        });

        console.log("📡 Respuesta del chat:", response.status, response.statusText);
        
        if (response.status === 401) {
            console.log("❌ No autorizado - sesión expirada en chat");
            mostrarAlerta("Tu sesión ha expirado. Serás redirigido al login.", "danger");
            sessionStorage.clear();
            window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.log("❌ Error del chat:", errorData);
            throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("✅ Respuesta del chat recibida:", data);

        // Mostrar respuesta del bot
        const botMessage = document.createElement('div');
        botMessage.classList.add('campo-bot');
        botMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">${data.message}</p>
            </div>
        `;
        chatMensajes.appendChild(botMessage);
        scrollToBottom(chatMensajes);
        
    } catch (error) {
        console.error("❌ Error en el chat:", error);
        
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('campo-bot');
        errorMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">🚫 Error: ${error.message}</p>
                <small class="text-muted">Verifica tu conexión y autenticación</small>
            </div>
        `;
        chatMensajes.appendChild(errorMessage);
        scrollToBottom(chatMensajes);
    }
}

// ✅ FUNCIÓN DE VERIFICACIÓN DE AUTENTICACIÓN
async function verificarAutenticacion() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// ✅ FUNCIONES DE API ACTUALIZADAS CON COOKIES

async function obtenerUsuarios() {
    console.log("Obteniendo usuarios...");
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener usuarios: ${response.statusText}`);
        }
        const usuarios = await response.json();
        renderizarUsuarios(usuarios);
    } catch (error) {
        console.error(error);
    }
}

async function crearUsuario(usuario) {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios`, {
            method: "POST",
            body: JSON.stringify(usuario)
        });
        
        if (!response.ok) {
            throw new Error(`Error al crear usuario: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Usuario creado:", resultado);
        obtenerUsuarios();
    } catch (error) {
        console.error(error);
    }
}

// ✅ FUNCIONES DE ALMACENAMIENTO DE ALERTAS PARA REDIRECCIONES
function guardarAlertaParaSiguientePagina(mensaje, tipo = "info") {
    sessionStorage.setItem("alertMessage", mensaje);
    sessionStorage.setItem("alertType", tipo);
}

function mostrarAlertaGuardada() {
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

// ✅ FUNCIÓN MEJORADA DE ALERTA (FALLBACK AL CONTENEDOR)
function mostrarAlerta(mensaje, tipo = "info") {
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

// ✅ SISTEMA DE TOAST FLOTANTE PROFESIONAL
function mostrarToast(mensaje, tipo = "info", duracion = 5000) {
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

// ✅ ACTUALIZAR ELIMINAR USUARIO PARA USAR COOKIES
async function eliminarUsuario(userId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
        return;
    }
    console.log("Eliminando usuario con ID:", userId);
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/${userId}`, {
            method: "DELETE"
        });
        
        const resultado = await response.json();
        if (!response.ok) {
            // Mostrar mensaje claro si tiene proyectos asociados
            if (resultado.message && resultado.message.includes("proyectos asociados")) {
                mostrarToast("No se puede eliminar el usuario porque tiene proyectos asociados. Elimine primero los proyectos de este usuario.", "danger");
            } else if (resultado.message && resultado.message.includes("administrador")) {
                mostrarToast("No se puede eliminar el usuario administrador.", "danger");
            } else {
                mostrarToast(resultado.message || response.statusText, "danger");
            }
            throw new Error(resultado.message || response.statusText);
        }
        console.log("Usuario eliminado:", resultado);
        mostrarToast("Usuario eliminado con éxito", "success");
        // Recargar después de un breve delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        obtenerUsuarios(); // Actualizar la lista de usuarios
    } catch (error) {
        console.error(error);
    }
}

// ✅ ACTUALIZAR OBTENER PROYECTO POR ID
async function obtenerProyectoPorId(proyectoId) {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyectoId}`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener el proyecto: ${response.statusText}`);
        }
        const proyecto = await response.json();
        if (!proyecto) {
            return null;
        }
        console.log("Proyecto obtenido:", proyecto);
        return proyecto;
    } catch (error) {
        console.error(error);
        mostrarAlerta("Hubo un error al obtener el proyecto.", "danger");
    }
}

// ✅ ACTUALIZAR OBTENER USUARIO POR ID
async function obtenerUsuarioPorId(usuarioId) {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/${usuarioId}`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener el usuario: ${response.statusText}`);
        }
        const usuario = await response.json();
        return usuario;
    } catch (error) {
        console.error(error);
        mostrarAlerta("Hubo un error al obtener el usuario.", "danger");
        return null;
    }
}

// ✅ ACTUALIZAR ELIMINAR PROYECTO
async function eliminarProyecto(proyectoId, elementoDOM) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        return;
    }
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error(`Error al eliminar proyecto: ${response.statusText}`);
        }
        
        // ✅ Toast inmediato
        mostrarToast("Proyecto eliminado con éxito", "success");

        if (elementoDOM) {
            elementoDOM.remove(); // Elimina el proyecto del DOM
        }
    } catch (error) {
        console.error(error);
        mostrarToast("Hubo un error al eliminar el proyecto.", "danger");
    }
}

async function obtenerProyectos() {
    console.log("Obteniendo proyectos...");
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener proyectos: ${response.statusText}`);
        }
        const proyectos = await response.json();
        return proyectos;
    } catch (error) {
        console.error(error);
        return [];
    }
}

// ✅ FUNCIÓN MEJORADA PARA RENDERIZAR PROYECTOS
function renderizarProyectos(proyectos, usuarios) {
    const proyectosContainer = document.getElementById("proyectos-container");
    if (!proyectosContainer) return;

    console.log("Renderizando proyectos:", proyectos);

    // Actualizar contador
    document.getElementById("total-proyectos").textContent = proyectos.length;

    if (!proyectos || proyectos.length === 0) {
        proyectosContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>No hay proyectos</h3>
                    <p>Crea tu primer proyecto para comenzar</p>
                    <a href="/perfil/proyecto_nuevo" class="btn btn-primary">
                        <i class="fas fa-plus me-1"></i>Crear Proyecto
                    </a>
                </div>
            </div>
        `;
        return;
    }

    proyectosContainer.innerHTML = "";
    proyectos.forEach((proyecto) => {
        const usuario = usuarios.find(u => u.id === proyecto.usuario_id);
        const nombreUsuario = usuario ? usuario.username : 'Usuario desconocido';
        
        const proyectoCard = document.createElement("div");
        proyectoCard.classList.add("col-md-6", "col-xl-4", "mb-3");
        proyectoCard.innerHTML = `
            <div class="project-card">
                <h3 class="project-title">${proyecto.nombre}</h3>
                <p class="project-description">${proyecto.descripcion || 'Sin descripción disponible'}</p>
                <div class="project-meta">
                    <div><strong>Propietario:</strong> ${nombreUsuario}</div>
                    <div><strong>Creado:</strong> ${new Date(proyecto.fecha_creacion).toLocaleDateString('es-ES')}</div>
                    <div><strong>Modificado:</strong> ${new Date(proyecto.fecha_modificacion).toLocaleDateString('es-ES')}</div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-edit" onclick="window.location.href='/perfil/proyecto_editar/${proyecto.id}'">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button class="btn btn-delete" onclick="eliminarProyecto('${proyecto.id}', this.closest('.col-md-6'))">
                        <i class="fas fa-trash me-1"></i>Eliminar
                    </button>
                </div>
            </div>
        `;
        proyectosContainer.appendChild(proyectoCard);
    });
}

// ✅ FUNCIÓN MEJORADA PARA RENDERIZAR USUARIOS
function renderizarUsuarios(usuarios) {
    const usuariosContainer = document.getElementById("usuarios-container");
    const usuariosSection = document.getElementById("usuarios-section");
    
    if (!usuariosContainer) return;

    // Mostrar sección de usuarios solo para admin
    if (usuariosSection) {
        usuariosSection.style.display = 'block';
    }

    console.log("Renderizando usuarios:", usuarios);

    if (!usuarios || usuarios.length === 0) {
        usuariosContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay usuarios</h3>
                    <p>Crea el primer usuario del sistema</p>
                    <a href="/perfil/usuario_nuevo" class="btn btn-success">
                        <i class="fas fa-user-plus me-1"></i>Crear Usuario
                    </a>
                </div>
            </div>
        `;
        return;
    }

    obtenerRolUsuario().then(rol => {
            rolUsuario.textContent = rol === 'admin' ? 'Admin' : 'Usuario';
    });

    usuariosContainer.innerHTML = "";
    usuarios.forEach((usuario) => {
        const usuarioCard = document.createElement("div");
        usuarioCard.classList.add("col-md-6", "col-xl-4", "mb-3");
        usuarioCard.innerHTML = `
            <div class="user-card">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <h3 class="user-title">${usuario.username}</h3>
                <div class="user-info">
                    <div><strong>Nombre:</strong> ${usuario.nombre} ${usuario.apellidos}</div>
                    <div><strong>Email:</strong> ${usuario.email}</div>
                </div>
                <span class="user-role ${usuario.roles === 'admin' ? 'admin' : 'user'}">
                    ${usuario.roles || 'user'}
                </span>
                <div class="user-actions">
                    <button class="btn btn-edit" onclick="window.location.href='/perfil/usuario_editar/${usuario.id}'">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button class="btn btn-delete" onclick="eliminarUsuario('${usuario.id}')">
                        <i class="fas fa-trash me-1"></i>Eliminar
                    </button>
                </div>
            </div>
        `;
        usuariosContainer.appendChild(usuarioCard);
    });
}

// ✅ FUNCIÓN MEJORADA PARA RENDERIZAR INFORMACIÓN PERSONAL
function renderizarInformacionPersonal(usuario) {
    const profileInfo = document.getElementById("profile-info");
    const rolUsuario = document.getElementById("rol-usuario");
    
    if (!profileInfo) return;

    console.log("Renderizando información personal:", usuario);

    profileInfo.innerHTML = `
        <h3>${usuario.nombre} ${usuario.apellidos}</h3>
        <p>@${usuario.username}</p>
        <p class="text-muted small">${usuario.email}</p>
    `;

    if (rolUsuario) {
        obtenerRolUsuario().then(rol => {
            rolUsuario.textContent = rol === 'admin' ? 'Admin' : 'Usuario';
        });
    }
}

// ✅ ACTUALIZAR EDITAR PROYECTO
async function editarProyecto(proyectoId) {
    console.log("Editando proyecto con ID:", proyectoId);
    const proyecto = await obtenerProyectoPorId(proyectoId);
    console.log("Proyecto a editar:", proyecto);
    if (proyecto) {
        localStorage.setItem("proyectoEditar", proyecto.id);
    }
    if (!proyecto) {
        mostrarAlerta("No se pudo cargar el proyecto. Redirigiendo al perfil.", "danger");
        window.location.href = "/perfil";
        return;
    }

    // Generar el formulario de edición
    const formContainer = document.createElement("div");
    formContainer.classList.add("card-body");
    formContainer.innerHTML = `
        <form action="/perfil/proyecto_editar/${proyecto.id}" method="post">
            <div class="mb-3">
                <label for="nombre" class="form-label"><strong>Nombre del proyecto:</strong></label>
                <input type="text" id="nombre" name="nombre" class="form-control" required value="${proyecto.nombre}">
            </div>
            <div class="mb-3">
                <label for="descripcion" class="form-label"><strong>Descripción:</strong></label>
                <textarea id="descripcion" name="descripcion" class="form-control" rows="4" placeholder="Describe brevemente el proyecto">${proyecto.descripcion}</textarea>
            </div>
            <div class="text-center">
                <button type="submit" class="btn btn-primary">Actualizar</button>
                <a href="/perfil" class="btn btn-secondary">Cancelar</a>
            </div>
        </form>
    `;
    document.getElementById("proyecto-editar-container").appendChild(formContainer);

    const form = formContainer.querySelector("form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = document.getElementById("nombre").value;
        const descripcion = document.getElementById("descripcion").value;

        try {
            const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyecto.id}`, {
                method: "PUT",
                body: JSON.stringify({ nombre, descripcion })
            });

            if (!response.ok) {
                throw new Error("Error al actualizar el proyecto");
            }

            mostrarAlerta("Proyecto actualizado con éxito", "success");
            window.location.href = "/perfil";
        } catch (error) {
            mostrarAlerta("Hubo un error al actualizar el proyecto", "danger");
            console.error(error);
        }
    });
}

// ✅ ACTUALIZAR EDITAR USUARIO
async function editarUsuario(usuarioId) {
    console.log("Editando usuario con ID:", usuarioId);
    const usuario = await obtenerUsuarioPorId(usuarioId);
    console.log("Usuario a editar:", usuario);
    if (usuario) {
        localStorage.setItem("usuarioEditar", usuario.id);
    }
    if (!usuario) {
        mostrarAlerta("No se pudo cargar el usuario. Redirigiendo al perfil.", "danger");
        window.location.href = "/perfil";
        return;
    }

    // Generar el formulario de edición
    const formContainer = document.createElement("div");
    formContainer.classList.add("card-body");
    formContainer.innerHTML = `
        <form action="/perfil/usuario_editar/${usuario.id}" method="post">
            <div class="mb-3">
                <label for="username" class="form-label"><strong>Nombre de usuario:</strong></label>
                <input type="text" id="username" name="username" class="form-control" required value="${usuario.username}">
            </div>
            <div class="mb-3">
                <label for="nombre" class="form-label"><strong>Nombre:</strong></label>
                <input type="text" id="nombre" name="nombre" class="form-control" required value="${usuario.nombre}">
            </div>
            <div class="mb-3">
                <label for="apellidos" class="form-label"><strong>Apellidos:</strong></label>
                <input type="text" id="apellidos" name="apellidos" class="form-control" required value="${usuario.apellidos}">
            </div>
            <div class="mb-3">
                <label for="email" class="form-label"><strong>Email:</strong></label>
                <input type="email" id="email" name="email" class="form-control" required value="${usuario.email}">
            </div>
            <div class="mb-3">
                <label for="password" class="form-label"><strong>Contraseña:</strong></label>
                <input type="password" id="password" name="password" class="form-control" placeholder="Dejar en blanco para no cambiar">
            </div>
            <div class="text-center">
                <button type="submit" class="btn btn-primary">Actualizar</button>
                <a href="/perfil" class="btn btn-secondary">Cancelar</a>
            </div>
        </form>
    `;
    document.getElementById("usuario-editar-container").appendChild(formContainer);

    const form = formContainer.querySelector("form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const nombre = document.getElementById("nombre").value;
        const apellidos = document.getElementById("apellidos").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const body = { username, nombre, apellidos, email };
            if (password) {
                body.password = password;
            }

            const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                method: "PUT",
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error("Error al actualizar el usuario");
            }

            mostrarAlerta("Usuario actualizado con éxito", "success");
            window.location.href = "/perfil";
        } catch (error) {
            mostrarAlerta("Hubo un error al actualizar el usuario", "danger");
            console.error(error);
        }
    });
}

async function cargarFormularioCrearProyecto() {
    const form = document.getElementById("crear-proyecto-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = document.getElementById("nombre").value;
        const descripcion = document.getElementById("descripcion").value;

        try {
            const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos`, {
                method: "POST",
                body: JSON.stringify({ nombre, descripcion })
            });

            if (!response.ok) {
                throw new Error("Error al crear el proyecto");
            }

            // ✅ Toast inmediato + redirección
            mostrarToast("Proyecto creado con éxito", "success", 3000);
            setTimeout(() => {
                window.location.href = "/perfil";
            }, 1500);
        } catch (error) {
            console.error("Error al crear el proyecto:", error);
            mostrarToast("Hubo un error al crear el proyecto", "danger");
        }
    });
}

async function cargarFormularioCrearUsuario() {
    const form = document.getElementById("usuario-nuevo-form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const nombre = document.getElementById("nombre").value;
        const apellidos = document.getElementById("apellidos").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const nuevoUsuario = {
            username: username,
            nombre: nombre,
            apellidos: apellidos,
            email: email,
            password: password,
        };

        try {
            await crearUsuario(nuevoUsuario);
            mostrarToast("Usuario creado con éxito", "success");
            setTimeout(() => {
                window.location.href = "/perfil";
            }, 1500);
        }
        catch (error) {
            console.error("Error al crear el usuario:", error);
            mostrarToast("Hubo un error al crear el usuario", "danger");
        }
    });
};

async function cargarDatosAdmin() {
    console.log("Cargando datos...");
    
    try {
        const [proyectosRes, usuariosRes] = await Promise.all([
            fetchWithCredentials(`${API_BASE_URL}/proyectos`),
            fetchWithCredentials(`${API_BASE_URL}/usuarios`)
        ]);

        if (!proyectosRes.ok || !usuariosRes.ok) {
            throw new Error("Error al cargar datos");
        }

        const proyectos = await proyectosRes.json();
        const usuarios = await usuariosRes.json();

        console.log("Proyectos:", proyectos);
        console.log("Usuarios:", usuarios);

        renderizarProyectos(proyectos, usuarios);
        renderizarUsuarios(usuarios);
        
        // Renderizar usuario actual
        const usernameActual = sessionStorage.getItem("username");
        const usuarioActual = usuarios.find(usuario => usuario.username === usernameActual);

        if (usuarioActual) {
            renderizarInformacionPersonal(usuarioActual);
        }

        console.log("Datos cargados correctamente.");
  
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        sessionStorage.clear();
        window.location.href = "/login";
    }
}

// ✅ ACTUALIZAR CARGAR DATOS USUARIOS PARA USAR COOKIES
async function cargarDatosUsuarios() {
    console.log("Cargando datos de usuarios...");
    
    try {
        const [proyectosRes, usuariosRes] = await Promise.all([
            fetchWithCredentials(`${API_BASE_URL}/proyectos`),
            fetchWithCredentials(`${API_BASE_URL}/usuarios`)
        ]);

        if (!proyectosRes.ok || !usuariosRes.ok) {
            throw new Error("Error al cargar datos");
        }

        const proyectos = await proyectosRes.json();
        const usuarios = await usuariosRes.json();

        console.log("Proyectos:", proyectos);
        console.log("Usuarios:", usuarios);

        renderizarProyectos(proyectos, usuarios);
        
        // Renderizar usuario actual
        const usernameActual = sessionStorage.getItem("username");
        const usuarioActual = usuarios.find(usuario => usuario.username === usernameActual);

        if (usuarioActual) {
            renderizarInformacionPersonal(usuarioActual);
        }

        console.log("Datos cargados correctamente.");
  
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        sessionStorage.clear();
        window.location.href = "/login";
    }
}

// ✅ ACTUALIZAR LOGIN PARA ACTUALIZAR NAVEGACIÓN
async function logearUsuario() {
    console.log("Iniciando sesión...");
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetchWithCredentials(`${API_BASE_URL}/login`, {
                method: "POST",
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                mostrarToast("Usuario o contraseña incorrectos", "danger");
                return;
            }
            
            const data = await response.json();
            sessionStorage.setItem("username", username);
            
            // ✅ Actualizar navegación después del login
            actualizarNavegacion(true);

            // ✅ Toast de bienvenida inmediato
            mostrarToast(`¡Bienvenido, ${username}!`, "success", 4000);
            
            setTimeout(() => {
                window.location.href = "/perfil";
            }, 1500);
            
        } catch (error) {
            console.error(error);
            mostrarToast("Error al iniciar sesión. Verifica tus credenciales.", "danger");
        }
    });
}

// ✅ ACTUALIZAR LOGOUT PARA ACTUALIZAR NAVEGACIÓN
async function cerrarSesion() {
    try {
        await fetchWithCredentials(`${API_BASE_URL}/logout`, {
            method: "POST"
        });
        
        sessionStorage.clear();

        // ✅ Usar toast inmediato en lugar de guardar para siguiente página
        mostrarToast("Sesión cerrada correctamente", "success", 3000);
        
        // Actualizar navegación
        actualizarNavegacion(false);
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);
        
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        sessionStorage.clear();
        actualizarNavegacion(false);
        
        mostrarToast("Sesión cerrada", "info", 3000);
        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);
    }
}

async function obtenerRolUsuario() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener el rol del usuario: ${response.statusText}`);
        }
        const rol = await response.json();
        console.log("Rol del usuario obtenido:", rol);
        return rol.rol[0];
    } catch (error) {
        console.error("Error al obtener el rol del usuario:", error);
        return null;
    }
}

function configurarLogout() {
    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
        logoutLink.addEventListener("click", function() {
            cerrarSesion(); // ✅ Usar la función de logout con cookies
        });
    }
}

// ✅ FUNCIÓN PARA MOSTRAR/OCULTAR ELEMENTOS DE NAVEGACIÓN
function actualizarNavegacion(estaLogueado) {
    const elementosUsuario = document.querySelectorAll('.user-only');
    const elementosInvitado = document.querySelectorAll('.guest-only');
    
    if (estaLogueado) {
        // Mostrar elementos para usuarios logueados
        elementosUsuario.forEach(elemento => {
            elemento.style.display = 'block';
        });
        // Ocultar elementos para invitados
        elementosInvitado.forEach(elemento => {
            elemento.style.display = 'none';
        });
    } else {
        // Ocultar elementos para usuarios logueados
        elementosUsuario.forEach(elemento => {
            elemento.style.display = 'none';
        });
        // Mostrar elementos para invitados
        elementosInvitado.forEach(elemento => {
            elemento.style.display = 'block';
        });
    }
}

// ✅ FUNCIÓN PARA VERIFICAR ESTADO DE AUTENTICACIÓN Y ACTUALIZAR NAVEGACIÓN
async function verificarYActualizarNavegacion() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        const estaLogueado = response.ok;
        
        console.log("Estado de autenticación:", estaLogueado ? "Logueado" : "No logueado");
        actualizarNavegacion(estaLogueado);
        
        return estaLogueado;
    } catch (error) {
        console.log("Error verificando autenticación:", error);
        actualizarNavegacion(false);
        return false;
    }
}

// ✅ MODIFICAR LA FUNCIÓN DE NAVEGACIÓN CON AUTENTICACIÓN
async function navegarConAutenticacion(url) {
    const estaLogueado = await verificarYActualizarNavegacion();
    
    if (estaLogueado) {
        window.location.href = url;
    } else {
        mostrarAlerta("Debes iniciar sesión para acceder a esta sección.", "warning");
        setTimeout(() => {
            window.location.href = "/login";
        }, 2000);
    }
}

// ==================== CHAT ====================
// ... existing code ...

// ✅ VARIABLES GLOBALES DEL CHAT
let proyectoActualChat = null;
let chatMensajes = null;
let messageInput = null;
let sendButton = null;

// ✅ FUNCIÓN MEJORADA PARA INICIALIZAR EL CHAT
function inicializarChat() {
    console.log("Inicializando chat...");
    
    // Seleccionar elementos del chat
    chatMensajes = document.getElementById('chat-mensajes');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');

    if (!chatMensajes || !messageInput || !sendButton) {
        console.error("No se encontraron elementos del chat:", {
            chatMensajes: !!chatMensajes,
            messageInput: !!messageInput,
            sendButton: !!sendButton
        });
        return;
    }

    // Configurar event listeners
    configurarEventosChat();
    
    // Cargar proyectos en el sidebar
    cargarProyectosSidebar();

    console.log("Chat inicializado correctamente");
    return { chatMensajes, messageInput, sendButton };
}

// ✅ CONFIGURAR EVENTOS DEL CHAT
function configurarEventosChat() {
    // Enviar mensaje con botón
    sendButton.addEventListener('click', enviarMensaje);
    
    // Enviar mensaje con Enter
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            enviarMensaje();
        }
    });
}

// ✅ FUNCIÓN PARA ENVIAR MENSAJE
function enviarMensaje() {
    if (!proyectoActualChat) {
        mostrarToast("Selecciona un proyecto primero", "warning");
        return;
    }

    const messageText = messageInput.value.trim();
    if (messageText === '') return;

    // Añadir mensaje del usuario al chat
    agregarMensajeAlChat(messageText, 'user');
    
    // Limpiar input
    messageInput.value = '';
    
    // Enviar al servidor
    enviarMensajeAlServidor(messageText);
}

// ✅ FUNCIÓN PARA AGREGAR MENSAJE AL CHAT
function agregarMensajeAlChat(mensaje, tipo) {
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${tipo}`;
    
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageGroup.innerHTML = `
        <div class="message-avatar ${tipo}">
            <i class="fas fa-${tipo === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble ${tipo}">
                ${mensaje}
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;
    
    chatMensajes.appendChild(messageGroup);
    scrollToBottom();
}

// ✅ FUNCIÓN PARA SCROLL AUTOMÁTICO
function scrollToBottom() {
    if (chatMensajes) {
        chatMensajes.scrollTop = chatMensajes.scrollHeight;
    }
}

// ✅ FUNCIÓN PARA ENVIAR MENSAJE AL SERVIDOR
async function enviarMensajeAlServidor(messageText) {
    try {
        console.log("🚀 Enviando mensaje para proyecto:", proyectoActualChat.nombre);
        
        const response = await fetchWithCredentials(`${API_BASE_URL_CHAT}/chat/mensajes`, {
            method: 'POST',
            body: JSON.stringify({ 
                message: messageText,
                proyecto_id: proyectoActualChat.id,
                proyecto_nombre: proyectoActualChat.nombre
            })
        });

        if (response.status === 401) {
            mostrarToast("Tu sesión ha expirado", "danger");
            setTimeout(() => window.location.href = "/login", 2000);
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Respuesta recibida:", data);

        // Mostrar respuesta del bot
        agregarMensajeAlChat(data.message, 'bot');
        
    } catch (error) {
        console.error("❌ Error en el chat:", error);
        agregarMensajeAlChat(
            `🚫 Error: ${error.message}. Verifica tu conexión.`, 
            'bot'
        );
    }
}

// ✅ FUNCIÓN ÚNICA PARA CARGAR PROYECTOS EN EL SIDEBAR
async function cargarProyectosSidebar() {
    const sidebarChat = document.getElementById("proyectos-sidebar");
    if (!sidebarChat) {
        console.error("No se encontró el elemento proyectos-sidebar");
        return;
    }

    console.log("Cargando proyectos para el sidebar...");

    try {
        // Mostrar loading mientras carga
        sidebarChat.innerHTML = `
            <div class="loading-projects">
                <div class="skeleton-project"></div>
                <div class="skeleton-project"></div>
                <div class="skeleton-project"></div>
            </div>
        `;

        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos`);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log("No autorizado, redirigiendo al login");
                window.location.href = "/login";
                return;
            }
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const proyectos = await response.json();
        console.log("Proyectos cargados para chat:", proyectos);

        renderizarProyectosSidebar(proyectos);
        
    } catch (error) {
        console.error("Error al cargar proyectos del sidebar:", error);
        sidebarChat.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="fas fa-exclamation-circle mb-2"></i>
                <p>Error al cargar proyectos</p>
                <p class="small text-danger">${error.message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="cargarProyectosSidebar()">
                    <i class="fas fa-redo me-1"></i>Reintentar
                </button>
            </div>
        `;
    }
}

// ✅ FUNCIÓN PARA RENDERIZAR PROYECTOS EN EL SIDEBAR (SIMPLIFICADA)
function renderizarProyectosSidebar(proyectos) {
    const sidebarChat = document.getElementById("proyectos-sidebar");
    
    if (!proyectos || proyectos.length === 0) {
        sidebarChat.innerHTML = `
            <div class="text-center p-4 text-muted">
                <div class="welcome-icon mb-3">
                    <i class="fas fa-folder-plus"></i>
                </div>
                <h5>No hay proyectos</h5>
                <p class="small">Crea tu primer proyecto para empezar a chatear</p>
                <a href="/perfil/proyecto_nuevo" class="btn btn-sm btn-primary">
                    <i class="fas fa-plus me-1"></i>Crear Proyecto
                </a>
            </div>
        `;
        return;
    }

    sidebarChat.innerHTML = "";
    
    proyectos.forEach((proyecto) => {
        const proyectoElement = document.createElement("div");
        proyectoElement.className = "project-item";
        proyectoElement.dataset.proyectoId = proyecto.id;
        
        proyectoElement.innerHTML = `
            <div class="project-info">
                <div class="project-name">${proyecto.nombre}</div>
                <div class="project-description">${proyecto.descripcion || 'Sin descripción'}</div>
            </div>
            <div class="project-actions">
                <button class="btn-project-action btn-delete-project" 
                        onclick="eliminarProyectoChat(${proyecto.id})"
                        title="Eliminar proyecto">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Añadir evento de click para seleccionar proyecto
        proyectoElement.addEventListener('click', (e) => {
            if (!e.target.closest('.project-actions')) {
                seleccionarProyecto(proyecto);
            }
        });
        
        sidebarChat.appendChild(proyectoElement);
    });

    console.log(`${proyectos.length} proyectos renderizados en el sidebar`);
}

// ✅ FUNCIÓN PARA SELECCIONAR PROYECTO
function seleccionarProyecto(proyecto) {
    proyectoActualChat = proyecto;
    
    console.log("Proyecto seleccionado:", proyecto);
    
    // Actualizar UI del sidebar
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-proyecto-id="${proyecto.id}"]`).classList.add('active');
    
    // Actualizar header del chat
    document.getElementById('current-project-name').textContent = proyecto.nombre;
    document.getElementById('current-project-status').textContent = 
        `Chat activo • ${proyecto.descripcion || 'Sin descripción'}`;
    
    // Habilitar input y botón
    messageInput.disabled = false;
    messageInput.placeholder = `Pregunta sobre "${proyecto.nombre}"...`;
    sendButton.disabled = false;
    
    // Limpiar chat y mostrar mensaje de inicio
    limpiarChatSilencioso();
    agregarMensajeAlChat(
        `¡Hola! Ahora estamos hablando sobre el proyecto "${proyecto.nombre}". ¿En qué puedo ayudarte?`, 
        'bot'
    );
    
    mostrarToast(`Chat iniciado para "${proyecto.nombre}"`, "success", 2000);
}

// ✅ FUNCIÓN PARA LIMPIAR CHAT
function limpiarChat() {
    if (!proyectoActualChat) {
        mostrarToast("Selecciona un proyecto primero", "warning");
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar el chat?')) {
        limpiarChatSilencioso();
        agregarMensajeAlChat(
            `Chat limpiado. Continuemos hablando sobre "${proyectoActualChat.nombre}".`, 
            'bot'
        );
    }
}

// ✅ FUNCIÓN PARA LIMPIAR CHAT SIN CONFIRMACIÓN
function limpiarChatSilencioso() {
    if (chatMensajes) {
        // Remover welcome message si existe
        const welcomeMessage = chatMensajes.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Remover todos los mensajes
        const messages = chatMensajes.querySelectorAll('.message-group');
        messages.forEach(msg => msg.remove());
    }
}

// ✅ FUNCIÓN PARA ELIMINAR PROYECTO DESDE EL CHAT
async function eliminarProyectoChat(proyectoId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        return;
    }
    
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error(`Error al eliminar proyecto: ${response.statusText}`);
        }
        
        mostrarToast("Proyecto eliminado con éxito", "success");
        
        // Si era el proyecto actual, limpiar chat
        if (proyectoActualChat && proyectoActualChat.id == proyectoId) {
            proyectoActualChat = null;
            messageInput.disabled = true;
            messageInput.placeholder = "Selecciona un proyecto para empezar a chatear...";
            sendButton.disabled = true;
            
            document.getElementById('current-project-name').textContent = "Selecciona un proyecto";
            document.getElementById('current-project-status').textContent = "Para comenzar a chatear";
            
            chatMensajes.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>¡Bienvenido al Chat!</h3>
                    <p>Selecciona un proyecto de la barra lateral para comenzar a chatear con la IA sobre ese proyecto específico.</p>
                </div>
            `;
        }
        
        // Recargar proyectos
        cargarProyectosSidebar();
        
    } catch (error) {
        console.error(error);
        mostrarToast("Hubo un error al eliminar el proyecto.", "danger");
    }
}

// ✅ FUNCIÓN DE DEBUG TEMPORAL
function debugChat() {
    console.log("=== DEBUG CHAT ===");
    console.log("chat-mensajes:", document.getElementById('chat-mensajes'));
    console.log("messageInput:", document.getElementById('messageInput'));
    console.log("sendButton:", document.getElementById('sendButton'));
    console.log("proyectos-sidebar:", document.getElementById('proyectos-sidebar'));
    console.log("chat-container:", document.querySelector('.chat-container'));
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("=================");
}

document.addEventListener("DOMContentLoaded", () => {
    mostrarAlertaGuardada();

    configurarLogout();
    console.log("Configuración de logout completada.");

    console.log("DOM completamente cargado y analizado.");

    // ✅ DETECTAR LA PÁGINA DE CHAT CORRECTAMENTE
    if (document.getElementById("chat-mensajes") || document.querySelector('.chat-container')) {
        console.log("🚀 Página de chat detectada, inicializando...");
        inicializarChat();
    }

    if (document.getElementById("login-form")) {
        console.log("Formulario de inicio de sesión encontrado.");
        logearUsuario();
    }
    
    if (document.getElementById("crear-proyecto-form")) {
        cargarFormularioCrearProyecto();
    }

    if (document.getElementById("usuario-nuevo-form")) {
        cargarFormularioCrearUsuario();
    }

    if (
        document.getElementById("proyectos-container") ||
        document.getElementById("usuarios-container")
    ) {
        obtenerRolUsuario().then(rol => {
            if (rol === "admin") {
                cargarDatosAdmin();
            } else if (rol === "user") {
                cargarDatosUsuarios();
            } else {
                console.error("Rol de usuario no reconocido:", rol);
            }
        }).catch(error => {
            console.error("Error al obtener el rol del usuario:", error);
        });
    }

    if (document.getElementById("proyecto-editar-container")) {
        const pathParts = window.location.pathname.split("/");
        const proyectoId = pathParts[pathParts.length - 1];
        editarProyecto(proyectoId);
    }

    if (document.getElementById("usuario-editar-container")) {
        const pathParts = window.location.pathname.split("/");
        const usuarioId = pathParts[pathParts.length - 1];
        editarUsuario(usuarioId);
    }
    
    animateSteps();
});