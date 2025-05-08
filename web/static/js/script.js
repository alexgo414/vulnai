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
const API_BASE_URL_CHAT = "https://vulnaimicro.pythonanywhere.com";
// Base URL de la API
const API_BASE_URL = "https://vulnaimicro.pythonanywhere.com/api";

// Función para enviar el mensaje al servidor y mostrar la respuesta (Ejercicio 3)
async function sendMessageToServer(messageText, chatMensajes) {
    try {
        // Realizar la petición POST al servidor
        const token = sessionStorage.getItem("token");
        console.log("Token encontrado:", token);
        const response = await fetch(`${API_BASE_URL_CHAT}/chat/mensajes`, {
            method: 'POST',
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: messageText }),
        });

        // Si el usuario no está autenticado, redirige al login
        if (response.status === 401) {
            window.location.href = "/login";
            return;
        }

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error('Error al conectar con el servidor');
        }

        // Obtener la respuesta del servidor como JSON
        const data = await response.json();

        // Mostrar la respuesta del bot
        const botMessage = document.createElement('div');
        botMessage.classList.add('campo-bot');
        botMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">${data.message || 'No se recibió respuesta del servidor'}</p>
            </div>
        `;
        chatMensajes.appendChild(botMessage);

        scrollToBottom(chatMensajes);
        //chatMensajes.scrollTop = chatMensajes.scrollHeight;
    } catch (error) {
        // Mostrar mensaje de error si falla la conexión
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('campo-bot');
        errorMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">Error: No se pudo conectar con el servidor</p>
            </div>
        `;
        chatMensajes.appendChild(errorMessage);

        // Hacer scroll al final
        scrollToBottom(chatMensajes);
    }
}

// Funciones para la api

// Función para obtener y renderizar usuarios
async function obtenerUsuarios() {
    console.log("Obteniendo usuarios...");
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        if (!response.ok) {
            throw new Error(`Error al obtener usuarios: ${response.statusText}`);
        }
        const usuarios = await response.json();
        renderizarUsuarios(usuarios);
    } catch (error) {
        console.error(error);
    }
}

// Función para crear un nuevo usuario
async function crearUsuario(usuario) {
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(usuario),
        });
        if (!response.ok) {
            throw new Error(`Error al crear usuario: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Usuario creado:", resultado);
        obtenerUsuarios(); // Actualizar la lista de usuarios
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

// Función para eliminar un usuario
async function eliminarUsuario(userId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
        return;
    }
    console.log("Eliminando usuario con ID:", userId);
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
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

// Función para obtener un proyecto por ID
async function obtenerProyectoPorId(proyectoId) {
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
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

async function obtenerUsuarioPorId(usuarioId) {
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
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

// Función para eliminar un proyecto
async function eliminarProyecto(proyectoId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        return;
    }
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        if (!response.ok) {
            throw new Error(`Error al eliminar proyecto: ${response.statusText}`);
        }
        const resultado = await response.json();
        mostrarAlerta("Proyecto eliminado con éxito", "success");
        obtenerProyectos(); // Actualizar la lista de proyectos
    } catch (error) {
        console.error(error);
        alert("Hubo un error al eliminar el proyecto");
    }
}

// Función para obtener y renderizar proyectos
async function obtenerProyectos() {
    try {
        const token = sessionStorage.getItem("token");
        const proyectosresponse = await fetch(`${API_BASE_URL}/proyectos`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        const usuariosresponse = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        if (!proyectosresponse.ok) {
            throw new Error(`Error al obtener proyectos: ${response.statusText}`);
        }
        if (!usuariosresponse.ok) {
            throw new Error(`Error al obtener usuarios: ${response.statusText}`);
        }
        const proyectos = await proyectosresponse.json();
        const usuarios = await usuariosresponse.json();
        console.log("Proyectos obtenidos:", proyectos);
        console.log("Usuarios obtenidos:", usuarios);
        renderizarProyectos(proyectos, usuarios); // Renderizar proyectos con usuarios
    } catch (error) {
        console.error(error);
    }
}

// Función para renderizar usuarios en el HTML
function renderizarUsuarios(usuarios) {
    const usuariosContainer = document.getElementById("usuarios-container"); // Selecciona el contenedor de usuarios
    usuariosContainer.innerHTML = ""; // Limpia el contenido previo
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
                    <button class="btn btn-danger" onclick="eliminarProyecto('${proyecto.id}')">Eliminar</button>
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

// Función para manejar la edición del proyecto
async function editarProyecto(proyectoId) {
    console.log("Editando proyecto con ID:", proyectoId);
    const proyecto = await obtenerProyectoPorId(proyectoId);
    console.log("Proyecto a editar:", proyecto);
    if (proyecto) {
        // Almacenar el proyecto en localStorage
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
        const token = sessionStorage.getItem("token");

        try {
            const response = await fetch(`${API_BASE_URL}/proyectos/${proyecto.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({ nombre, descripcion })
            });

            if (!response.ok) {
                throw new Error("Error al actualizar el proyecto");
            }

            alert("Proyecto actualizado con éxito");
            window.location.href = "/perfil"; // Redirige al perfil o donde quieras
        } catch (error) {
            alert("Hubo un error al actualizar el proyecto");
            console.error(error);
        }
    });
}

// Función para manejar la edición del usuario
async function editarUsuario(usuarioId) {
    console.log("Editando usuario con ID:", usuarioId);
    const usuario = await obtenerUsuarioPorId(usuarioId);
    console.log("Usuario a editar:", usuario);
    if (usuario) {
        // Almacenar el usuario en localStorage
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
        let password;
        // Si la contraseña está vacía, no se envía al servidor
        if (document.getElementById("password").value) {
            password = document.getElementById("password").value;
        }
        const token = sessionStorage.getItem("token");

        try {
            let response;
            if (password) {
                response = await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ username, nombre, apellidos, email, password })
                });
            } else {
                response = await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ username, nombre, apellidos, email })
                });   
            }
            if (!response.ok) {
                throw new Error("Error al actualizar el usuario");
            }

            alert("Usuario actualizado con éxito");
            window.location.href = "/perfil"; // Redirige al perfil o donde quieras
        } catch (error) {
            alert("Hubo un error al actualizar el usuario");
            console.error(error);
        }
    });
}

// Función para crear un nuevo proyecto
async function crearProyecto(proyecto) {
    console.log("Creando proyecto:", proyecto);
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/proyectos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(proyecto),
        });
        if (!response.ok) {
            throw new Error(`Error al crear proyecto: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Proyecto creado:", resultado);
    } catch (error) {
        console.error(error);
    }
}

// Manejar el envío del formulario al cargar la página
async function cargarFormularioCrearProyecto() {
    const form = document.getElementById("crear-proyecto-form");

    // Manejar el envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        // Obtener los datos del formulario
        const nombre = document.getElementById("nombre").value;
        const descripcion = document.getElementById("descripcion").value;

        // Crear el objeto del proyecto
        const nuevoProyecto = {
            nombre: nombre,
            descripcion: descripcion,
        };

        // Llamar a la función crearProyecto
        try {
            await crearProyecto(nuevoProyecto); // Reutilizar la función crearProyecto
            alert("Proyecto creado con éxito");
            window.location.href = "/perfil"; // Redirigir al perfil después de crear el proyecto
        } catch (error) {
            console.error("Error al crear el proyecto:", error);
            alert("Hubo un error al crear el proyecto");
        }
    });
};

// Manejar el envío del formulario al cargar la página
async function cargarFormularioCrearUsuario() {
    const form = document.getElementById("usuario-nuevo-form");

    // Manejar el envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        // Obtener los datos del formulario
        const username = document.getElementById("username").value;
        const nombre = document.getElementById("nombre").value;
        const apellidos = document.getElementById("apellidos").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        // Crear el objeto del usuario
        const nuevoUsuario = {
            username: username,
            nombre: nombre,
            apellidos: apellidos,
            email: email,
            password: password,
        };

        // Llamar a la función crearUsuario
        try {
            await crearUsuario(nuevoUsuario); // Reutilizar la función crearUsuario
            alert("Usuario creado con éxito");
            window.location.href = "/perfil"; // Redirigir al perfil después de crear el usuario
        }
        catch (error) {
            console.error("Error al crear el usuario:", error);
            alert("Hubo un error al crear el usuario");
        }
    });
};

async function cargarDatosAdmin() {
    console.log("Cargando datos...");
    // Verificar si el token existe en sessionStorage
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    console.log("Token encontrado:", token);
    try {
        const [proyectosRes, usuariosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/proyectos`, {
            headers: { "Authorization": "Bearer " + token }
        }),
        fetch(`${API_BASE_URL}/usuarios`, {
            headers: { "Authorization": "Bearer " + token }
        })
        ]);

        const proyectosText = await proyectosRes.text();
        const usuariosText = await usuariosRes.text();

        if (proyectosText.includes("Token has expired") || usuariosText.includes("Token has expired")) {
        sessionStorage.clear();
        window.location.href = "/login";
        return;
        }

        console.log("Respuesta de proyectos:", proyectosText);
        console.log("Respuesta de usuarios:", usuariosText);

        const proyectos = JSON.parse(proyectosText);
        const usuarios = JSON.parse(usuariosText);

        console.log("Proyectos:", proyectos);
        console.log("Usuarios:", usuarios);

        // Renderizar proyectos
        renderizarProyectos(proyectos, usuarios);
        // Renderizar usuarios
        renderizarUsuarios(usuarios);
        // Renderizar el usuario actual a partir de usuarios
        const usernameActual = sessionStorage.getItem("username");
        console.log("Username actual:", usernameActual);
        const usuarioActual = usuarios.find(usuario => usuario.username === usernameActual);
        console.log("Usuario actual:", usuarioActual);

        if (usuarioActual) {
            renderizarInformacionPersonal(usuarioActual);
        } else {
            console.error("Usuario actual no encontrado en la lista de usuarios.");
        }

        console.log("Datos cargados correctamente.");
  
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        sessionStorage.clear();
        window.location.href = "/login";
    }
};

async function cargarDatosUsuarios() {
    console.log("Cargando datos...");
    // Verificar si el token existe en sessionStorage
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    console.log("Token encontrado:", token);
    try {
        const proyectosRes = await fetch(`${API_BASE_URL}/proyectos`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const usuariosRes = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: { "Authorization": "Bearer " + token }
        });

        const proyectosText = await proyectosRes.text();
        const usuariosText = await usuariosRes.text();

        if (proyectosText.includes("Token has expired")) {
        sessionStorage.clear();
        window.location.href = "/login";
        return;
        }

        console.log("Respuesta de proyectos:", proyectosText);

        const proyectos = JSON.parse(proyectosText);
        const usuarios = JSON.parse(usuariosText);


        console.log("Proyectos:", proyectos);

        // Renderizar proyectos
        renderizarProyectos(proyectos, usuarios);
        console.log("Usuarios:", usuarios);
        // Renderizar el usuario actual a partir de usuarios
        const usernameActual = sessionStorage.getItem("username");
        console.log("Username actual:", usernameActual);
        const usuarioActual = usuarios.find(usuario => usuario.username === usernameActual);
        console.log("Usuario actual:", usuarioActual);

        if (usuarioActual) {
            renderizarInformacionPersonal(usuarioActual);
        } else {
            console.error("Usuario actual no encontrado en la lista de usuarios.");
        }

        console.log("Datos cargados correctamente.");
  
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        sessionStorage.clear();
        window.location.href = "/login";
    }
};

async function logearUsuario() {
    console.log("Iniciando sesión...");
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evitar el envío tradicional del formulario
        console.log("Formulario de inicio de sesión enviado.");

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                alert("Usuario o contraseña incorrectos");
                return;
            }
            
            const data = await response.json();
            if (!data.access_token) {
                alert("Error al iniciar sesión. Token no recibido.");
                return;
            }

            sessionStorage.setItem("username", username);
            console.log("Username guardado:", username);
            sessionStorage.setItem("token", data.access_token);
            console.log("Token guardado:", data.access_token);

            window.location.href = "/perfil";
        } catch (error) {
            console.error(error);
            alert("Error al iniciar sesión. Verifica tus credenciales.");
        }
    });
}

async function obtenerRolUsuario() {
    try {
        const token = sessionStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/usuarios/rol`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        if (!response.ok) {
            throw new Error(`Error al obtener el rol del usuario: ${response.statusText}`);
        }
        const rol = await response.json();
        console.log("Rol del usuario obtenido:", rol);
        console.log("Rol del usuario:", rol.rol[0]);
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
            sessionStorage.clear(); // Limpiar el token del sessionStorage
            console.log("Sesión cerrada. Token eliminado.");
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {

    configurarLogout(); // Configurar el evento de logout
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
        // Extraer el ID de la URL
        const pathParts = window.location.pathname.split("/");
        const proyectoId = pathParts[pathParts.length - 1];
        editarProyecto(proyectoId);
    }

    if (document.getElementById("usuario-editar-container")) {
        // Extraer el ID de la URL
        const pathParts = window.location.pathname.split("/");
        const usuarioId = pathParts[pathParts.length - 1];
        editarUsuario(usuarioId);
    }
    
    animateSteps();
});