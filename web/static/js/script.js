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

function inicializarChat() {
    // Seleccionar elementos del chat
    const chatMensajes = document.querySelector('.chat-mensajes');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // Mostrar mensaje de bienvenida (Ejercicio 1)
    const mensajeBienvenida = document.createElement('div');
    mensajeBienvenida.classList.add('campo-bot');
    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot icono-bot"></i>
        </div>
        <div class="mensaje-bot">
            <p class="my-2">¡Hola! Bienvenido, ¿en qué puedo ayudarte?</p>
        </div>
    `;
    chatMensajes.prepend(mensajeBienvenida);
    scrollToBottom(chatMensajes);

    return { chatMensajes, messageInput, sendButton };
}

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
            alert("Tu sesión ha expirado. Serás redirigido al login.");
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
            alert("Tu sesión ha expirado. Serás redirigido al login.");
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

function mostrarAlerta(mensaje, tipo = "info") {
    // tipo: 'success', 'danger', 'warning', 'info'
    const container = document.getElementById("container-alert");
    if (!container) return;

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
                mostrarAlerta("No se puede eliminar el usuario porque tiene proyectos asociados. Elimine primero los proyectos de este usuario.", "danger");
            } else if (resultado.message && resultado.message.includes("administrador")) {
                mostrarAlerta("No se puede eliminar el usuario administrador.", "danger");
            } else {
                mostrarAlerta(resultado.message || response.statusText, "danger");
            }
            throw new Error(resultado.message || response.statusText);
        }
        console.log("Usuario eliminado:", resultado);
        mostrarAlerta("Usuario eliminado con éxito", "success");
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
        alert("Hubo un error al obtener el proyecto.");
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
        alert("Hubo un error al obtener el usuario.");
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
        const resultado = await response.json();
        mostrarAlerta("Proyecto eliminado con éxito", "success");
        if (elementoDOM) {
            elementoDOM.remove(); // Elimina el proyecto del DOM
        }
    } catch (error) {
        console.error(error);
        alert("Hubo un error al eliminar el proyecto");
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

// Función para renderizar usuarios en el HTML
function renderizarUsuarios(usuarios) {
    const usuariosContainer = document.getElementById("usuarios-container");
    usuariosContainer.innerHTML = "";
    usuariosContainer.innerHTML = `
        <h1 class="text-center mb-4">Usuarios</h1>
        <div class="text-center mb-3">
            <a href="/perfil/usuario_nuevo" class="btn btn-success">Crear usuario</a>
        </div>
    `
    usuarios.forEach((usuario) => {
        const usuarioDiv = document.createElement("div");
        usuarioDiv.classList.add("col-md-6", "col-lg-4", "mb-4");
        usuarioDiv.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary">${usuario.username}</h5>
                    <p class="card-text">
                        <strong>Nombre:</strong> ${usuario.nombre} <br>
                        <strong>Apellidos:</strong> ${usuario.apellidos} <br>
                        <strong>Email:</strong> ${usuario.email}
                    </p>
                </div>
                <div class="card-footer d-flex justify-content-between">
                    <button class="btn btn-primary btn-editar">Editar</button>
                    <button class="btn btn-danger btn-eliminar">Eliminar</button>
                </div>
            </div>
        `;
        // Añadir listeners después de insertar el HTML
        usuarioDiv.querySelector('.btn-editar').addEventListener('click', () => {
            window.location.href = `/perfil/usuario_editar/${usuario.id}`;
        });
        usuarioDiv.querySelector('.btn-eliminar').addEventListener('click', () => {
            eliminarUsuario(usuario.id);
        });
        usuariosContainer.appendChild(usuarioDiv);
    });
}

// Función para renderizar proyectos en el HTML
function renderizarProyectos(proyectos, usuarios) {
    const proyectosContainer = document.getElementById("proyectos-container");
    if (!proyectosContainer) return;
    proyectosContainer.innerHTML = `
        <h1 class="text-center mb-4">Proyectos</h1>
        <div class="text-center mb-3">
            <a href="/perfil/proyecto_nuevo" class="btn btn-success">Crear proyecto</a>
        </div>
    `;
    proyectos.forEach((proyecto) => {
        const propietario = usuarios.find(usuario => usuario.id === proyecto.usuario_id);
        const propietarioNombre = propietario ? propietario.username : "Desconocido";
        const proyectoDiv = document.createElement("div");
        proyectoDiv.classList.add("col-md-6", "col-lg-4", "mb-4");
        proyectoDiv.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary">${proyecto.nombre}</h5>
                    <p class="card-text">${proyecto.descripcion}</p>
                    <p class="text-muted">
                        <strong>Propietario:</strong> ${propietarioNombre} <br>
                        <strong>Fecha de creación:</strong> ${proyecto.fecha_creacion} <br>
                        <strong>Fecha de modificación:</strong> ${proyecto.fecha_modificacion}
                    </p>
                </div>
                <div class="card-footer d-flex justify-content-between">
                    <button class="btn btn-primary" onclick="window.location.href='/perfil/proyecto_editar/${proyecto.id}'">Editar</button>
                    <button class="btn btn-danger" onclick="eliminarProyecto('${proyecto.id}', this.closest('.col-md-6'))">Eliminar</button>
                </div>
            </div>
        `;
        proyectosContainer.appendChild(proyectoDiv);
    });
}

// Función para renderizar información personal en el HTML
function renderizarInformacionPersonal(usuario) {
    const informacionPersonalContainer = document.getElementById("informacion-personal-container");
    if (!informacionPersonalContainer) return;
    informacionPersonalContainer.innerHTML = `
        <h1 class="text-center mb-4">Información Personal</h1>
    `;
    
    const informacionPersonalDiv = document.createElement("div");
    informacionPersonalDiv.classList.add("col-md-6", "col-lg-4", "mb-4");
    informacionPersonalDiv.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <h5 class="card-title text-primary">${usuario.username}</h5>
                <p class="card-text">
                    <strong>Nombre:</strong> ${usuario.nombre} <br>
                    <strong>Apellidos:</strong> ${usuario.apellidos} <br>
                    <strong>Email:</strong> ${usuario.email}
                </p>
            </div>
            <div class="card-footer d-flex justify-content-between">
                <button class="btn btn-primary btn-editar">Editar</button>
            </div>
        </div>
    `;
    // Añadir listeners después de insertar el HTML
    informacionPersonalDiv.querySelector('.btn-editar').addEventListener('click', () => {
        window.location.href = `/perfil/usuario_editar/${usuario.id}`;
    });
    informacionPersonalContainer.appendChild(informacionPersonalDiv);
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
        alert("No se pudo cargar el proyecto. Redirigiendo al perfil.");
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

            alert("Proyecto actualizado con éxito");
            window.location.href = "/perfil";
        } catch (error) {
            alert("Hubo un error al actualizar el proyecto");
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
        alert("No se pudo cargar el usuario. Redirigiendo al perfil.");
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

            alert("Usuario actualizado con éxito");
            window.location.href = "/perfil";
        } catch (error) {
            alert("Hubo un error al actualizar el usuario");
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

            alert("Proyecto creado con éxito");
            window.location.href = "/perfil";
        } catch (error) {
            console.error("Error al crear el proyecto:", error);
            alert("Hubo un error al crear el proyecto");
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
            alert("Usuario creado con éxito");
            window.location.href = "/perfil";
        }
        catch (error) {
            console.error("Error al crear el usuario:", error);
            alert("Hubo un error al crear el usuario");
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

// ✅ LOGIN ACTUALIZADO PARA COOKIES
async function logearUsuario() {
    console.log("Iniciando sesión...");
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formulario de inicio de sesión enviado.");

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            console.log("Datos de inicio de sesión:", { username, password });
            
            const response = await fetchWithCredentials(`${API_BASE_URL}/login`, {
                method: "POST",
                body: JSON.stringify({ username, password })
            });
            
            console.log("Respuesta del servidor:", response);

            if (!response.ok) {
                alert("Usuario o contraseña incorrectos");
                return;
            }
            
            const data = await response.json();
            console.log("Datos de inicio de sesión recibidos:", data);
            
            // ✅ Solo guardamos el username para referencia
            sessionStorage.setItem("username", username);
            console.log("Username guardado:", username);

            window.location.href = "/perfil";
        } catch (error) {
            console.error(error);
            alert("Error al iniciar sesión. Verifica tus credenciales.");
        }
    });
}

// ✅ LOGOUT ACTUALIZADO
async function cerrarSesion() {
    try {
        await fetchWithCredentials(`${API_BASE_URL}/logout`, {
            method: "POST"
        });
        
        sessionStorage.clear();
        window.location.href = "/login";
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        sessionStorage.clear();
        window.location.href = "/login";
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

// ✅ ACTUALIZAR SIDEBAR CHAT PARA USAR COOKIES
async function renderizarNombresProyectosSidebarChat() {
    const sidebarChat = document.getElementById("proyectos-sidebar");
    if (!sidebarChat) return;

    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos`);
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }
            throw new Error("Error al obtener proyectos");
        }

        const proyectos = await response.json();
        console.log("Proyectos para sidebar:", proyectos);

        sidebarChat.innerHTML = "";
        proyectos.forEach((proyecto) => {
            const proyectoDiv = document.createElement("div");
            proyectoDiv.classList.add("proyecto-chat");
            proyectoDiv.innerHTML = `
                <div class="d-flex align-items-center justify-content-between list-group-item list-group-item-action project-item mb-2">
                    <span>${proyecto.nombre}</span>
                    <button type="button" class="btn btn-sm btn-danger delete-button" title="Eliminar" data-id="${proyecto.id}">
                        <svg class="trash-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                        </svg>
                    </button>
                </div>
            `;
            sidebarChat.appendChild(proyectoDiv);
        });

        // Añadir listeners a los botones de borrar
        sidebarChat.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const proyectoId = this.getAttribute('data-id');
                eliminarProyecto(proyectoId, this.closest('.proyecto-chat'));
            });
        });
    } catch (error) {
        console.error("Error al cargar proyectos del sidebar:", error);
    }
}

// ✅ FUNCIÓN DE DEBUG PARA EL CHAT
async function debugChat() {
    console.log("🔍 Debugeando servidor de chat...");
    
    // Test 1: Verificar si el servidor responde
    try {
        const healthResponse = await fetch("http://localhost:5002/health");
        const healthData = await healthResponse.json();
        console.log("✅ Health check:", healthData);
    } catch (error) {
        console.log("❌ Servidor de chat no responde:", error);
        return;
    }
    
    // Test 2: Verificar autenticación
    try {
        const authResponse = await fetchWithCredentials("http://localhost:5001/usuarios/rol");
        console.log("✅ Autenticación:", authResponse.ok ? "OK" : "FAIL");
    } catch (error) {
        console.log("❌ Error de autenticación:", error);
    }
}

// ✅ FUNCIÓN DE DEBUG MEJORADA
async function debugChat() {
    console.log("🔍 Debugeando servidor de chat...");
    
    // Test 1: Verificar si el servidor responde (sin CORS)
    try {
        console.log("📡 Probando conexión directa al chat...");
        const response = await fetch("http://localhost:5002/health", {
            method: "GET",
            mode: "cors",
            credentials: "include"
        });
        console.log("✅ Respuesta del servidor:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Health check exitoso:", data);
        } else {
            console.log("❌ Health check falló:", response.status);
        }
    } catch (error) {
        console.log("❌ Error conectando al chat:", error);
    }
    
    // Test 2: Probar endpoint de chat
    try {
        console.log("📡 Probando endpoint de chat...");
        const response = await fetch("http://localhost:5002/chat/mensajes", {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: "test" })
        });
        console.log("✅ Test de chat:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Respuesta de chat:", data);
        }
    } catch (error) {
        console.log("❌ Error en test de chat:", error);
    }
}

// ✅ FUNCIÓN ESPECÍFICA PARA DEBUG DE AUTENTICACIÓN
async function debugAutenticacion() {
    console.log("🔍 Debugeando autenticación completa...");
    
    // 1. Ver cookies
    console.log("🍪 document.cookie:", document.cookie);
    
    // 2. Test endpoint API principal
    try {
        const apiResponse = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        console.log("📡 API principal (/usuarios/rol):", apiResponse.status);
        if (apiResponse.ok) {
            const apiData = await apiResponse.json();
            console.log("✅ Datos del usuario:", apiData);
        } else {
            console.log("❌ Error en API principal:", apiResponse.statusText);
        }
    } catch (error) {
        console.log("❌ Error conectando a API principal:", error);
    }
    
    // 3. Test endpoint chat
    try {
        const chatResponse = await fetchWithCredentials(`${API_BASE_URL_CHAT}/health`);
        console.log("📡 Chat (/health):", chatResponse.status);
        if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            console.log("✅ Estado del chat:", chatData);
        }
    } catch (error) {
        console.log("❌ Error conectando a chat:", error);
    }
    
    // 4. Test mensaje chat
    try {
        const messageResponse = await fetchWithCredentials(`${API_BASE_URL_CHAT}/chat/mensajes`, {
            method: 'POST',
            body: JSON.stringify({ message: "test de debug" })
        });
        console.log("📡 Chat (/chat/mensajes):", messageResponse.status);
        if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            console.log("✅ Respuesta del chat:", messageData);
        } else {
            console.log("❌ Error en chat:", messageResponse.statusText);
        }
    } catch (error) {
        console.log("❌ Error en mensaje de chat:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {

    configurarLogout();
    console.log("Configuración de logout completada.");

    console.log("DOM completamente cargado y analizado.");
    if (document.getElementById("login-form")) {
        console.log("Formulario de inicio de sesión encontrado.");
        logearUsuario();
    }

    if (document.getElementById("container-chat")) {
        const { chatMensajes, messageInput, sendButton } = inicializarChat();
        configurarChat(chatMensajes, messageInput, sendButton);
        configurarEnvioConEnter(messageInput, sendButton);
        renderizarNombresProyectosSidebarChat();
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