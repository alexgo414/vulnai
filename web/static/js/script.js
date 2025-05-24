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

// Función para configurar chat en mensajes del usuario
function configurarChat(chatMensajes, messageInput, sendButton) {
    if (!chatMensajes || !messageInput || !sendButton) {
        console.error('Elementos del chat no encontrados para configurar');
        return;
    }

    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            // Añadir mensaje del usuario
            const userMessage = document.createElement('div');
            userMessage.classList.add('campo-usuario');
            userMessage.innerHTML = `
                <div class="mensaje-usuario">
                    <div class="mensaje-contenido">
                        <p>${messageText}</p>
                    </div>
                </div>
                <div class="icono-usuario">
                    <i class="fas fa-user"></i>
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
    if (!messageInput || !sendButton) {
        console.error('Input o botón no encontrados para configurar Enter');
        return;
    }

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });
}

// Base URL del chat
const API_BASE_URL_CHAT = "http://localhost:5002";
// Base URL de la API
const API_BASE_URL = "http://localhost:5001";

// Variable global para el proyecto actual seleccionado
let proyectoActualChat = 'general';

// Función mejorada para cargar historial con scroll al final correcto
async function cargarHistorialProyecto(proyectoId) {
    try {
        const response = await fetch(`${API_BASE_URL_CHAT}/chat/historial/${proyectoId}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            const chatMensajes = document.querySelector('.chat-mensajes');
            
            // Limpiar chat actual
            chatMensajes.innerHTML = '';
            
            // Mostrar mensaje de bienvenida
            const mensajeBienvenida = document.createElement('div');
            mensajeBienvenida.classList.add('campo-bot');
            
            // Determinar mensaje de bienvenida según el proyecto
            let mensajeBienvenidaTexto;
            if (proyectoId === 'general') {
                mensajeBienvenidaTexto = '¡Hola! Soy tu asistente de IA especializado en desarrollo seguro. ¿En qué puedo ayudarte hoy?';
            } else {
                mensajeBienvenidaTexto = `¡Hola! Bienvenido al chat del proyecto. ¿En qué puedo ayudarte con este proyecto?`;
            }
            
            mensajeBienvenida.innerHTML = `
                <div class="icono-bot">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="mensaje-bot">
                    <div class="mensaje-contenido">
                        <p>${mensajeBienvenidaTexto}</p>
                    </div>
                </div>
            `;
            chatMensajes.appendChild(mensajeBienvenida);

            // NUEVO: Variable para contar elementos procesados
            let elementosProcesados = 0;
            const totalElementos = Math.ceil(data.historial.length / 2); // Pares de mensajes (usuario + bot)

            // Función para hacer scroll cuando todo esté listo
            const verificarYScrollear = () => {
                elementosProcesados++;
                if (elementosProcesados >= totalElementos) {
                    // NUEVO: Múltiples intentos de scroll con delays
                    setTimeout(() => scrollToBottomForzado(chatMensajes), 100);
                    setTimeout(() => scrollToBottomForzado(chatMensajes), 300);
                    setTimeout(() => scrollToBottomForzado(chatMensajes), 600);
                    setTimeout(() => scrollToBottomForzado(chatMensajes), 1000);
                }
            };

            // Cargar historial del proyecto
            const historial = data.historial;
            
            // Si no hay historial, solo hacer scroll del mensaje de bienvenida
            if (historial.length === 0) {
                setTimeout(() => scrollToBottomForzado(chatMensajes), 200);
                return;
            }

            for (let i = 0; i < historial.length; i += 2) {
                // Mensaje del usuario
                if (historial[i]) {
                    const userMessage = document.createElement('div');
                    userMessage.classList.add('campo-usuario');
                    userMessage.innerHTML = `
                        <div class="mensaje-usuario">
                            <div class="mensaje-contenido">
                                <p>${historial[i]}</p>
                            </div>
                        </div>
                        <div class="icono-usuario">
                            <i class="fas fa-user"></i>
                        </div>
                    `;
                    chatMensajes.appendChild(userMessage);
                }

                // Respuesta del bot - PROCESAR CON MARKDOWN
                if (historial[i + 1]) {
                    const botMessage = document.createElement('div');
                    botMessage.classList.add('campo-bot');
                    
                    // Procesar el mensaje del historial con Markdown
                    const mensajeProcesado = procesarMensajeGemini(historial[i + 1]);
                    
                    botMessage.innerHTML = `
                        <div class="icono-bot">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="mensaje-bot">
                            <div class="mensaje-contenido">${mensajeProcesado}</div>
                        </div>
                    `;
                    chatMensajes.appendChild(botMessage);
                    
                    // NUEVO: Procesar código Y verificar scroll después
                    setTimeout(() => {
                        const codeBlocks = botMessage.querySelectorAll('pre code');
                        codeBlocks.forEach(block => {
                            if (typeof hljs !== 'undefined') {
                                hljs.highlightElement(block);
                            }
                        });
                        
                        // Verificar si podemos scrollear
                        verificarYScrollear();
                    }, 150); // Aumentar delay para asegurar renderizado
                } else {
                    // Si solo hay mensaje de usuario, también verificar scroll
                    verificarYScrollear();
                }
            }

        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// Función para actualizar el indicador visual del proyecto seleccionado
function actualizarProyectoSeleccionado(proyectoId) {
    // Remover clase active de todos los proyectos
    document.querySelectorAll('.proyecto-chat .list-group-item').forEach(item => {
        item.classList.remove('active', 'text-white');
    });

    // Agregar clase active al proyecto seleccionado
    const proyectoSeleccionado = document.querySelector(`[data-proyecto-id="${proyectoId}"]`);
    if (proyectoSeleccionado) {
        proyectoSeleccionado.classList.add('active', 'text-white');
    }
}

// Función para obtener y renderizar usuarios
async function obtenerUsuarios() {
    console.log("Obteniendo usuarios...");
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
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
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: 'include', // Asegura que las cookies se envíen con la solicitud
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

function mostrarAlerta(mensaje, tipo = "info", flotante = false) {
    // tipo: 'success', 'danger', 'warning', 'info'
    const container = document.getElementById("container-alert");
    const isInChat = document.querySelector('.chat-container') !== null;

    // Mapeo de títulos por tipo
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

    if (flotante || isInChat) {
        // Crear alerta flotante (especialmente en chat)
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = alertHTML;
        const alertElement = alertDiv.firstElementChild;
        
        // Si estamos en chat, agregar al chat-container
        if (isInChat) {
            const chatContainer = document.querySelector('.chat-container');
            chatContainer.appendChild(alertElement);
        } else {
            document.body.appendChild(alertElement);
        }
        
        // Auto-remover después de 4 segundos
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
        
        // Hacer que sea clickeable para cerrar
        alertElement.addEventListener('click', () => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        });
        
    } else if (container) {
        // Alerta normal en container
        container.innerHTML = alertHTML;
        
        // Auto-scroll a la alerta
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Función para mostrar alertas de éxito flotantes
function mostrarExito(mensaje) {
    mostrarAlerta(mensaje, 'success', true);
}

// Función para mostrar alertas de error flotantes  
function mostrarError(mensaje) {
    mostrarAlerta(mensaje, 'danger', true);
}

// Función para eliminar un usuario
async function eliminarUsuario(userId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
        return;
    }
    console.log("Eliminando usuario con ID:", userId);
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: 'include', // Asegura que las cookies se envíen con la solicitud
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
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Asegura que las cookies se envíen con la solicitud
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
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Asegura que las cookies se envíen con la solicitud
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

// Función para eliminar un proyecto - ACTUALIZADA CON ALERTAS MEJORADAS
async function eliminarProyecto(proyectoId, elementoDOM) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto?")) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE",
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Error al eliminar proyecto: ${response.statusText}`);
        }
        const resultado = await response.json();
        
        // NUEVO: Mostrar alerta apropiada según el contexto
        const isInChat = document.querySelector('.chat-container') !== null;
        if (isInChat) {
            mostrarAlerta("Proyecto eliminado con éxito", "success", true);
        } else {
            mostrarAlerta("Proyecto eliminado con éxito", "success");
        }
        
        // Si el proyecto eliminado era el activo, cambiar a general
        const proyectoGuardado = localStorage.getItem('proyectoActualChat');
        if (proyectoGuardado == proyectoId) {
            localStorage.setItem('proyectoActualChat', 'general');
            proyectoActualChat = 'general';
            
            // Si estamos en el chat, cambiar al general
            if (isInChat) {
                actualizarProyectoSeleccionado('general');
                cargarHistorialProyecto('general');
                
                // Actualizar info del proyecto si existe
                const projectInfo = document.getElementById('project-info');
                if (projectInfo) {
                    projectInfo.innerHTML = `
                        <div class="project-status">
                            <i class="fas fa-comments"></i>
                            <span>Chat General Activo</span>
                        </div>
                    `;
                }
                
                // Recargar la lista de proyectos en el sidebar
                setTimeout(() => {
                    renderizarNombresProyectosSidebarChat();
                }, 1000);
            }
        }
        
        if (elementoDOM) {
            elementoDOM.remove();
        }
    } catch (error) {
        console.error(error);
        const isInChat = document.querySelector('.chat-container') !== null;
        if (isInChat) {
            mostrarAlerta("Hubo un error al eliminar el proyecto", "danger", true);
        } else {
            alert("Hubo un error al eliminar el proyecto");
        }
    }
}

// Función para obtener y renderizar proyectos
async function obtenerProyectos() {
    try {
        const proyectosresponse = await fetch(`${API_BASE_URL}/proyectos`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        const usuariosresponse = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
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
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${proyecto.nombre}</h5>
                    <p class="card-text">${proyecto.descripcion || 'Sin descripción'}</p>
                    <div class="project-meta">
                        <small class="text-muted">
                            <div class="mb-2">
                                <i class="fas fa-user me-1"></i><strong>Propietario:</strong> ${propietarioNombre}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-calendar-plus me-1"></i><strong>Creado:</strong><br>
                                ${formatearFecha(proyecto.fecha_creacion)}
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-edit me-1"></i><strong>Modificado:</strong><br>
                                ${formatearFecha(proyecto.fecha_modificacion)}
                            </div>
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="window.location.href='/perfil/proyecto_editar/${proyecto.id}'">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button id="btn-eliminar-proyecto-${proyecto.id}" class="btn btn-danger" onclick="eliminarProyecto('${proyecto.id}', this.closest('.col-lg-6'))">
                        <i class="fas fa-trash me-1"></i>Eliminar
                    </button>
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

        try {
            const response = await fetch(`${API_BASE_URL}/proyectos/${proyecto.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include', // Asegura que las cookies se envíen con la solicitud
                body: JSON.stringify({ nombre, descripcion })
            });

            if (!response.ok) {
                throw new Error("Error al actualizar el proyecto");
            }

            sessionStorage.setItem("alertMessage", "¡Proyecto actualizado con éxito!");
            sessionStorage.setItem("alertType", "success");

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

        try {
            let response;
            if (password) {
                response = await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: 'include', // Asegura que las cookies se envíen con la solicitud
                    body: JSON.stringify({ username, nombre, apellidos, email, password })
                });
            } else {
                response = await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: 'include', // Asegura que las cookies se envíen con la solicitud
                    body: JSON.stringify({ username, nombre, apellidos, email })
                });   
            }
            if (!response.ok) {
                throw new Error("Error al actualizar el usuario");
            }

            sessionStorage.setItem("alertMessage", "¡Usuario actualizado con éxito!");
            sessionStorage.setItem("alertType", "success");
            window.location.href = "/perfil"; // Redirige al perfil o donde quieras
        } catch (error) {
            alert("Hubo un error al actualizar el usuario");
            console.error(error);
        }
    });
}

// Función para crear un nuevo proyecto - ACTUALIZADA
async function crearProyecto(proyecto) {
    console.log("Creando proyecto:", proyecto);
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify(proyecto),
        });
        if (!response.ok) {
            throw new Error(`Error al crear proyecto: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Proyecto creado:", resultado);
        
        // NUEVO: Mostrar alerta apropiada según el contexto
        const isInChat = document.querySelector('.chat-container') !== null;
        if (isInChat) {
            mostrarAlerta("¡Proyecto creado con éxito! Ya puedes seleccionarlo en la barra lateral.", "success", true);
            // Recargar la lista de proyectos en el sidebar
            setTimeout(() => {
                renderizarNombresProyectosSidebarChat();
            }, 1000);
        } else {
            sessionStorage.setItem("alertMessage", "¡Proyecto creado con éxito!");
            sessionStorage.setItem("alertType", "success");
        }
        
        return resultado;
    } catch (error) {
        console.error(error);
        const isInChat = document.querySelector('.chat-container') !== null;
        if (isInChat) {
            mostrarAlerta("Error al crear el proyecto. Inténtalo de nuevo.", "danger", true);
        }
        throw error;
    }
}

// Manejar el envío del formulario al cargar la página - ACTUALIZADO
async function cargarFormularioCrearProyecto() {
    const form = document.getElementById("crear-proyecto-form");

    // Manejar el envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

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
            await crearProyecto(nuevoProyecto);
            
            // Detectar desde qué página se creó el proyecto
            const referrer = document.referrer;
            if (referrer.includes('/chat')) {
                // Si venimos del chat, quedarnos aquí y mostrar la alerta
                setTimeout(() => {
                    window.location.href = "/chat";
                }, 2000); // Dar tiempo a ver la alerta
            } else {
                sessionStorage.setItem("alertMessage", "¡Proyecto creado con éxito!");
                sessionStorage.setItem("alertType", "success");
                window.location.href = "/perfil";
            }
        } catch (error) {
            console.error("Error al crear el proyecto:", error);
            mostrarAlerta("Hubo un error al crear el proyecto", "danger", true);
        }
    });
}

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
            sessionStorage.setItem("alertMessage", "¡Usuario creado con éxito!");
            sessionStorage.setItem("alertType", "success");
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
    try {
        const [proyectosRes, usuariosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/proyectos`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/usuarios`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        })
        ]);

        const proyectosText = await proyectosRes.text();
        const usuariosText = await usuariosRes.text();

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
    try {
        const proyectosRes = await fetch(`${API_BASE_URL}/proyectos`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });
        const usuariosRes = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        const proyectosText = await proyectosRes.text();
        const usuariosText = await usuariosRes.text();

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
        
        // Limpiar storage si no está autenticado
        sessionStorage.clear();
        localStorage.clear();
        
        return false;
    }
}

async function cargarDatosPerfil() {
    console.log("Verificando autenticación...");
    
    // Verificar autenticación primero
    const estaAutenticado = await verificarAutenticacion();
    
    if (!estaAutenticado) {
        window.location.href = "/login";
        return;
    }
    
    try {
        // Mostrar skeleton loading
        mostrarSkeletonLoading();
        
        const response = await fetch(`${API_BASE_URL}/perfil/datos`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        if (!response.ok) {
            // Si no está autenticado, limpiar y redirigir
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = "/login";
            return;
        }

        const data = await response.json();
        console.log("Datos del perfil recibidos:", data);
        
        // Renderizar estadísticas
        renderizarEstadisticas(data);
        
        // Renderizar según lo que devuelva el backend
        if (data.proyectos) {
            renderizarProyectos(data.proyectos, data.usuarios || []);
        }
        
        if (data.usuarios && data.usuarios.length > 0) {
            renderizarUsuarios(data.usuarios);
        }
        
        if (data.usuario_actual) {
            renderizarInformacionPersonal(data.usuario_actual);
        }
        
        // Ocultar skeleton loading
        ocultarSkeletonLoading();
        
        console.log("Datos del perfil cargados correctamente.");
        
    } catch (error) {
        console.error("Error al cargar los datos del perfil:", error);
        
        // Limpiar storage si hay error
        sessionStorage.clear();
        localStorage.clear();
        
        // Mostrar error al usuario
        mostrarError("Error al cargar los datos. Redirigiendo al login...");
        
        // Redirigir al login después de un breve delay
        setTimeout(() => {
            window.location.href = "/login";
        }, 2000);
    }
}

// Función para renderizar estadísticas
function renderizarEstadisticas(data) {
    const statsContainer = document.getElementById("stats-cards");
    if (!statsContainer) return;
    
    const totalProyectos = data.proyectos ? data.proyectos.length : 0;
    const totalUsuarios = data.usuarios ? data.usuarios.length : 0;
    const proyectosRecientes = data.proyectos ? 
        data.proyectos.filter(p => {
            const fechaCreacion = new Date(p.fecha_creacion);
            const hace7Dias = new Date();
            hace7Dias.setDate(hace7Dias.getDate() - 7);
            return fechaCreacion > hace7Dias;
        }).length : 0;

    statsContainer.innerHTML = `
        <div class="col-md-4 mb-4">
            <div class="stats-card">
                <div class="stats-icon projects">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="stats-number">${totalProyectos}</h3>
                <p class="stats-label">Total Proyectos</p>
            </div>
        </div>
        <div class="col-md-4 mb-4">
            <div class="stats-card">
                <div class="stats-icon users">
                    <i class="fas fa-users"></i>
                </div>
                <h3 class="stats-number">${totalUsuarios}</h3>
                <p class="stats-label">Total Usuarios</p>
            </div>
        </div>
        <div class="col-md-4 mb-4">
            <div class="stats-card">
                <div class="stats-icon activity">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h3 class="stats-number">${proyectosRecientes}</h3>
                <p class="stats-label">Proyectos Recientes</p>
            </div>
        </div>
    `;
    
    // Animar números
    animarNumeros();
}

// Función para animar números en las estadísticas
function animarNumeros() {
    const numeros = document.querySelectorAll('.stats-number');
    
    numeros.forEach(numero => {
        const valorFinal = parseInt(numero.textContent);
        numero.textContent = '0';
        
        let valorActual = 0;
        const incremento = valorFinal / 50; // 50 pasos de animación
        
        const timer = setInterval(() => {
            valorActual += incremento;
            
            if (valorActual >= valorFinal) {
                numero.textContent = valorFinal;
                clearInterval(timer);
            } else {
                numero.textContent = Math.floor(valorActual);
            }
        }, 30); // 30ms entre cada paso
    });
}

// Función para mostrar skeleton loading
function mostrarSkeletonLoading() {
    const containers = ['proyectos-container', 'usuarios-container', 'stats-cards'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="loading-skeleton" style="height: 100px; border-radius: 12px; margin-bottom: 1rem;"></div>
                </div>
            `;
        }
    });
}

// Función para ocultar skeleton loading
function ocultarSkeletonLoading() {
    // El contenido real ya se ha cargado, no necesitamos hacer nada especial
}

// Función mejorada para renderizar proyectos
function renderizarProyectos(proyectos, usuarios) {
    const proyectosContainer = document.getElementById("proyectos-container");
    if (!proyectosContainer) return;
    
    if (proyectos.length === 0) {
        proyectosContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-project-diagram fa-4x text-muted mb-3"></i>
                    <h4>No hay proyectos</h4>
                    <p class="text-muted">Crea tu primer proyecto para comenzar</p>
                    <a href="/perfil/proyecto_nuevo" class="btn btn-success">
                        <i class="fas fa-plus me-2"></i>Crear Proyecto
                    </a>
                </div>
            </div>
        `;
        return;
    }

    proyectosContainer.innerHTML = "";
    
    proyectos.forEach((proyecto, index) => {
        const propietario = usuarios.find(usuario => usuario.id === proyecto.usuario_id);
        const propietarioNombre = propietario ? propietario.username : "Desconocido";
        
        const proyectoDiv = document.createElement("div");
        proyectoDiv.classList.add("col-lg-6", "col-xl-4", "mb-4");
        proyectoDiv.style.animationDelay = `${index * 0.1}s`;
        
        proyectoDiv.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${proyecto.nombre}</h5>
                    <p class="card-text">${proyecto.descripcion || 'Sin descripción'}</p>
                    <div class="project-meta">
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i><strong>Propietario:</strong> ${propietarioNombre}<br>
                            <i class="fas fa-calendar-plus me-1"></i><strong>Creado:</strong> ${formatearFecha(proyecto.fecha_creacion)}<br>
                            <i class="fas fa-edit me-1"></i><strong>Modificado:</strong> ${formatearFecha(proyecto.fecha_modificacion)}
                        </small>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary" onclick="window.location.href='/perfil/proyecto_editar/${proyecto.id}'">
                        <i class="fas fa-edit me-1"></i>Editar
                    </button>
                    <button class="btn btn-danger" onclick="eliminarProyecto('${proyecto.id}', this.closest('.col-lg-6'))">
                        <i class="fas fa-trash me-1"></i>Eliminar
                    </button>
                </div>
            </div>
        `;
        proyectosContainer.appendChild(proyectoDiv);
    });
}

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
        
        // Fecha exacta
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
            <div class="fecha-info">
                <div class="fecha-relativa" style="font-weight: 500;">${textoRelativo}</div>
                <div class="fecha-exacta" style="font-size: 0.8em; color: #6c757d;">${fechaExacta}</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error parseando fecha:', fechaString, error);
        return 'Error en fecha';
    }
}

// Función para toggle de contraseña
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    }
}

// Validación en tiempo real
function setupFormValidation() {
    const inputs = document.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid')) {
                validateField(this);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    // Limpiar clases previas
    field.classList.remove('is-valid', 'is-invalid');
    
    if (isRequired && !value) {
        field.classList.add('is-invalid');
        return false;
    }
    
    // Validaciones específicas
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            field.classList.add('is-invalid');
            return false;
        }
    }
    
    if (field.type === 'password' && value) {
        if (value.length < 6) {
            field.classList.add('is-invalid');
            return false;
        }
    }
    
    if (value) {
        field.classList.add('is-valid');
    }
    
    return true;
}

// Actualizar las funciones de edición para usar el nuevo estilo
function editarProyecto(proyectoId) {
    console.log("Editando proyecto con ID:", proyectoId);
    obtenerProyectoPorId(proyectoId).then(proyecto => {
        if (!proyecto) {
            alert("No se pudo cargar el proyecto. Redirigiendo al perfil.");
            window.location.href = "/perfil";
            return;
        }

        const container = document.getElementById("proyecto-editar-container");
        container.innerHTML = `
            <div class="form-card-header">
                <div class="form-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3>Editar Proyecto</h3>
                <p class="text-muted">Actualiza la información de: <strong>${proyecto.nombre}</strong></p>
            </div>
            
            <div class="form-card-body">
                <form id="editar-proyecto-form">
                    <div class="form-group">
                        <label for="nombre" class="form-label">
                            <i class="fas fa-tag me-2"></i>Nombre del Proyecto
                        </label>
                        <input type="text" id="nombre" name="nombre" class="form-control" required value="${proyecto.nombre}">
                    </div>
                    
                    <div class="form-group">
                        <label for="descripcion" class="form-label">
                            <i class="fas fa-align-left me-2"></i>Descripción
                        </label>
                        <textarea id="descripcion" name="descripcion" class="form-control" rows="4">${proyecto.descripcion || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-save me-2"></i>Guardar Cambios
                        </button>
                        <a href="/perfil" class="btn btn-secondary btn-lg">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </a>
                    </div>
                </form>
            </div>
        `;

        // Setup form validation
        setupFormValidation();

        // Form submission
        document.getElementById("editar-proyecto-form").addEventListener("submit", async (event) => {
            event.preventDefault();

            const nombre = document.getElementById("nombre").value;
            const descripcion = document.getElementById("descripcion").value;

            try {
                const response = await fetch(`${API_BASE_URL}/proyectos/${proyecto.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify({ nombre, descripcion })
                });

                if (!response.ok) {
                    throw new Error("Error al actualizar el proyecto");
                }

                sessionStorage.setItem("alertMessage", "¡Proyecto actualizado con éxito!");
                sessionStorage.setItem("alertType", "success");
                window.location.href = "/perfil";
            } catch (error) {
                alert("Hubo un error al actualizar el proyecto");
                console.error(error);
            }
        });
    });
}

function editarUsuario(usuarioId) {
    console.log("Editando usuario con ID:", usuarioId);
    obtenerUsuarioPorId(usuarioId).then(usuario => {
        if (!usuario) {
            alert("No se pudo cargar el usuario. Redirigiendo al perfil.");
            window.location.href = "/perfil";
            return;
        }

        const container = document.getElementById("usuario-editar-container");
        container.innerHTML = `
            <div class="form-card-header">
                <div class="form-icon">
                    <i class="fas fa-user"></i>
                </div>
                <h3>Editar Usuario</h3>
                <p class="text-muted">Actualiza la información de: <strong>${usuario.username}</strong></p>
            </div>
            
            <div class="form-card-body">
                <form id="editar-usuario-form">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="username" class="form-label">
                                    <i class="fas fa-at me-2"></i>Nombre de Usuario
                                </label>
                                <input type="text" id="username" name="username" class="form-control" required value="${usuario.username}">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="email" class="form-label">
                                    <i class="fas fa-envelope me-2"></i>Email
                                </label>
                                <input type="email" id="email" name="email" class="form-control" required value="${usuario.email}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="nombre" class="form-label">
                                    <i class="fas fa-user me-2"></i>Nombre
                                </label>
                                <input type="text" id="nombre" name="nombre" class="form-control" required value="${usuario.nombre}">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="apellidos" class="form-label">
                                    <i class="fas fa-user-tag me-2"></i>Apellidos
                                </label>
                                <input type="text" id="apellidos" name="apellidos" class="form-control" required value="${usuario.apellidos}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">
                            <i class="fas fa-lock me-2"></i>Nueva Contraseña
                        </label>
                        <div class="password-input-container">
                            <input type="password" id="password" name="password" class="form-control" 
                                   placeholder="Dejar en blanco para no cambiar">
                            <button type="button" class="password-toggle" onclick="togglePassword('password')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="form-help">Dejar en blanco si no deseas cambiar la contraseña</div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-save me-2"></i>Guardar Cambios
                        </button>
                        <a href="/perfil" class="btn btn-secondary btn-lg">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </a>
                    </div>
                </form>
            </div>
        `;

        // Setup form validation
        setupFormValidation();

        // Form submission
        document.getElementById("editar-usuario-form").addEventListener("submit", async (event) => {
            event.preventDefault();

            const username = document.getElementById("username").value;
            const nombre = document.getElementById("nombre").value;
            const apellidos = document.getElementById("apellidos").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const data = { username, nombre, apellidos, email };
            if (password) {
                data.password = password;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error("Error al actualizar el usuario");
                }

                sessionStorage.setItem("alertMessage", "¡Usuario actualizado con éxito!");
                sessionStorage.setItem("alertType", "success");
                window.location.href = "/perfil";
            } catch (error) {
                alert("Hubo un error al actualizar el usuario");
                console.error(error);
            }
        });
    });
}

// Toggle de contraseña para login
function togglePasswordLogin() {
    const input = document.getElementById('password');
    const toggle = document.querySelector('.password-toggle-login i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    }
}

// Mejorar la función de login para mostrar estado de carga
async function logearUsuario() {
    console.log("Iniciando sesión...");
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("Formulario de inicio de sesión enviado.");

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const loginBtn = document.querySelector('.login-btn');
        
        // Mostrar estado de carga
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            console.log("Datos de inicio de sesión:", { username, password });
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            console.log("Respuesta del servidor:", response);

            if (!response.ok) {
                mostrarAlerta("Usuario o contraseña incorrectos", "danger");
                return;
            }

            const data = await response.json();
            console.log("Datos de inicio de sesión recibidos:", data);
            sessionStorage.setItem("username", username);
            
            // Guardar mensaje de éxito para mostrarlo en la siguiente página
            sessionStorage.setItem("alertMessage", "¡Inicio de sesión exitoso!");
            sessionStorage.setItem("alertType", "success");

            // Redirigir inmediatamente sin setTimeout
            window.location.href = "/perfil";

        } catch (error) {
            console.error(error);
            mostrarAlerta("Error al iniciar sesión. Verifica tus credenciales.", "danger");
        } finally {
            // Quitar estado de carga
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });
}

// Agregar esta función al final de script.js

// Función para cerrar sesión correctamente
async function cerrarSesion() {
    console.log("Cerrando sesión...");
    
    try {
        // Hacer logout en el backend
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: 'include' // Importante para enviar cookies
        });

        // Limpiar todo el sessionStorage y localStorage
        sessionStorage.clear();
        localStorage.clear();
        
        // Mostrar mensaje de confirmación
        sessionStorage.setItem("alertMessage", "Sesión cerrada correctamente");
        sessionStorage.setItem("alertType", "success");
        
        console.log("Sesión cerrada correctamente");
        
        // Redirigir al login
        window.location.href = "/login";
        
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        
        // Aunque haya error, limpiar storage local
        sessionStorage.clear();
        localStorage.clear();
        
        // Redirigir anyway
        window.location.href = "/login";
    }
}

// Función para limpiar el chat
function limpiarChat() {
    const chatMensajes = document.querySelector('.chat-mensajes');
    if (chatMensajes) {
        chatMensajes.innerHTML = '';
        // Añadir mensaje de bienvenida
        const mensajeBienvenida = document.createElement('div');
        mensajeBienvenida.classList.add('campo-bot');
        mensajeBienvenida.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">¡Chat limpiado! ¿En qué puedo ayudarte ahora?</p>
            </div>
        `;
        chatMensajes.appendChild(mensajeBienvenida);
        scrollToBottom(chatMensajes);
    }
}

// Función mejorada para enviar mensajes al servidor
async function sendMessageToServer(messageText, chatMensajes) {
    console.log("Enviando mensaje al servidor:", messageText);
    
    const sendButton = document.getElementById('sendButton');
    
    // Mostrar estado de carga
    sendButton.classList.add('loading');
    sendButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL_CHAT}/chat/mensajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                message: messageText,
                proyecto_id: proyectoActualChat || 'general'
            }),
        });

        if (response.status === 401) {
            mostrarError("Sesión expirada. Redirigiendo al login...");
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);
            return;
        }

        if (response.ok) {
            const data = await response.json();
            
            // Procesar mensaje de Gemini con Markdown
            const mensajeProcesado = procesarMensajeGemini(data.message);
            
            // Añadir mensaje del bot con contenido procesado
            const botMessage = document.createElement('div');
            botMessage.classList.add('campo-bot');
            botMessage.innerHTML = `
                <div class="icono-bot">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="mensaje-bot">
                    <div class="mensaje-contenido">${mensajeProcesado}</div>
                </div>
            `;
            chatMensajes.appendChild(botMessage);
            
            // Resaltar código después de añadir al DOM
            setTimeout(() => {
                const codeBlocks = botMessage.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    hljs.highlightElement(block);
                });
            }, 100);
            
            scrollToBottom(chatMensajes);
        } else {
            mostrarError('Error al enviar mensaje. Inténtalo de nuevo.');
        }
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        mostrarError('Error de conexión. Verifica tu internet.');
    } finally {
        // Quitar estado de carga
        sendButton.classList.remove('loading');
        sendButton.disabled = false;
    }
}

// Actualizar la función de inicializar chat para la nueva interfaz
function inicializarChat() {
    const chatMensajes = document.getElementById('chat-messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    if (!chatMensajes || !messageInput || !sendButton) {
        console.error('Elementos del chat no encontrados');
        return { chatMensajes: null, messageInput: null, sendButton: null };
    }

    // Limpiar mensajes existentes
    chatMensajes.innerHTML = '';

    // Mostrar mensaje de bienvenida CORREGIDO
    const mensajeBienvenida = document.createElement('div');
    mensajeBienvenida.classList.add('campo-bot');
    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="mensaje-bot">
            <p>¡Hola! Soy tu asistente de IA especializado en desarrollo seguro. ¿En qué puedo ayudarte hoy?</p>
        </div>
    `;
    chatMensajes.appendChild(mensajeBienvenida);
    scrollToBottom(chatMensajes);

    return { chatMensajes, messageInput, sendButton };
}

// Actualizar la función para mantener el proyecto activo
async function renderizarNombresProyectosSidebarChat() {
    console.log("Cargando proyectos en sidebar...");
    const sidebarChat = document.getElementById("proyectos-sidebar");
    
    if (!sidebarChat) {
        console.error("Sidebar no encontrado");
        return;
    }

    try {
        console.log("Haciendo petición a:", `${API_BASE_URL}/proyectos`);
        const proyectosRes = await fetch(`${API_BASE_URL}/proyectos`, {
            headers: { "Content-Type": "application/json" },
            credentials: 'include'
        });

        console.log("Respuesta proyectos:", proyectosRes.status);
        
        if (!proyectosRes.ok) {
            throw new Error(`Error ${proyectosRes.status}: ${proyectosRes.statusText}`);
        }

        const proyectos = await proyectosRes.json();
        console.log("Proyectos recibidos:", proyectos);
        
        // Ordenar proyectos por fecha
        const proyectosOrdenados = proyectos.sort((a, b) => {
            return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
        });

        sidebarChat.innerHTML = "";

        // Agregar chat general
        const chatGeneralDiv = document.createElement("div");
        chatGeneralDiv.classList.add("proyecto-chat");
        chatGeneralDiv.innerHTML = `
            <div class="list-group-item list-group-item-action project-item chat-general-item" 
                 data-proyecto-id="general">
                <div class="d-flex align-items-center justify-content-between">
                    <span><i class="fas fa-comments me-2"></i><strong>Chat General</strong></span>
                </div>
            </div>
        `;
        sidebarChat.appendChild(chatGeneralDiv);

        // Agregar proyectos
        proyectosOrdenados.forEach((proyecto) => {
            const proyectoDiv = document.createElement("div");
            proyectoDiv.classList.add("proyecto-chat");
            proyectoDiv.innerHTML = `
                <div class="list-group-item list-group-item-action project-item" 
                     data-proyecto-id="${proyecto.id}">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="fas fa-folder me-2"></i>${proyecto.nombre}</span>
                        <button type="button" class="btn btn-sm delete-button" data-id="${proyecto.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            sidebarChat.appendChild(proyectoDiv);
        });

        // Agregar event listeners
        sidebarChat.querySelectorAll('[data-proyecto-id]').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.delete-button')) return;
                
                const proyectoId = this.getAttribute('data-proyecto-id');
                proyectoActualChat = proyectoId;
                
                // NUEVO: Guardar el proyecto activo en localStorage
                localStorage.setItem('proyectoActualChat', proyectoId);
                
                actualizarProyectoSeleccionado(proyectoId);
                cargarHistorialProyecto(proyectoId);
                actualizarInfoProyecto(proyectoId, proyectos);
            });
        });

        // Event listeners para eliminar
        sidebarChat.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const proyectoId = this.getAttribute('data-id');
                eliminarProyecto(proyectoId, this.closest('.proyecto-chat'));
            });
        });

        // NUEVO: Recuperar el proyecto activo desde localStorage
        const proyectoGuardado = localStorage.getItem('proyectoActualChat');
        let proyectoACargar = 'general';
        
        if (proyectoGuardado) {
            // Verificar que el proyecto guardado aún existe
            const proyectoExiste = proyectoGuardado === 'general' || 
                                 proyectos.some(p => p.id == proyectoGuardado);
            
            if (proyectoExiste) {
                proyectoACargar = proyectoGuardado;
            } else {
                // Si el proyecto no existe, limpiar localStorage
                localStorage.removeItem('proyectoActualChat');
            }
        }
        
        // Establecer el proyecto actual
        proyectoActualChat = proyectoACargar;
        
        // Seleccionar el proyecto correspondiente
        actualizarProyectoSeleccionado(proyectoACargar);
        actualizarInfoProyecto(proyectoACargar, proyectos);

    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        mostrarError('Error al cargar la lista de proyectos: ' + error.message);
    }
}

// Función para actualizar la información del proyecto activo
function actualizarInfoProyecto(proyectoId, proyectos) {
    const projectInfo = document.getElementById('project-info');
    if (!projectInfo) return;

    if (proyectoId === 'general') {
        projectInfo.innerHTML = `
            <div class="project-status">
                <i class="fas fa-comments"></i>
                <span>Chat General Activo</span>
            </div>
        `;
    } else {
        const proyecto = proyectos.find(p => p.id == proyectoId);
        if (proyecto) {
            projectInfo.innerHTML = `
                <div class="project-status">
                    <i class="fas fa-folder"></i>
                    <span>Proyecto: ${proyecto.nombre}</span>
                </div>
            `;
        }
    }
}

// Función mejorada para procesar mensajes de Gemini
function procesarMensajeGemini(contenido) {
    if (!contenido) return '';
    
    // Verificar si marked está disponible
    if (typeof marked === 'undefined') {
        console.warn('Marked.js no está disponible, devolviendo contenido sin procesar');
        return contenido.replace(/\n/g, '<br>'); // Al menos convertir saltos de línea
    }
    
    // Limpiar el contenido
    let mensajeLimpio = contenido.trim();
    
    try {
        // Convertir Markdown a HTML usando marked.js
        let html = marked.parse(mensajeLimpio);
        
        // Sanitizar y mejorar el HTML
        html = sanitizarHTML(html);
        
        return html;
    } catch (error) {
        console.error('Error procesando Markdown:', error);
        // Fallback: devolver contenido con saltos de línea convertidos
        return contenido.replace(/\n/g, '<br>');
    }
}

// Función para sanitizar HTML
function sanitizarHTML(html) {
    // Crear un elemento temporal para sanitizar
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Mejorar bloques de código
    const codeBlocks = temp.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        block.classList.add('hljs');
        
        // Agregar botón de copiar al código
        const pre = block.parentElement;
        pre.style.position = 'relative';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-btn';
        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyButton.title = 'Copiar código';
        copyButton.onclick = () => copiarCodigo(block.textContent);
        
        pre.appendChild(copyButton);
    });
    
    // Mejorar enlaces
    const links = temp.querySelectorAll('a');
    links.forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.classList.add('mensaje-link');
    });
    
    // Mejorar listas
    const listas = temp.querySelectorAll('ul, ol');
    listas.forEach(lista => {
        lista.classList.add('mensaje-lista');
    });
    
    // Mejorar tablas
    const tablas = temp.querySelectorAll('table');
    tablas.forEach(tabla => {
        tabla.classList.add('mensaje-tabla');
        
        // Envolver tabla en contenedor responsive
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        tabla.parentNode.insertBefore(wrapper, tabla);
        wrapper.appendChild(tabla);
    });
    
    return temp.innerHTML;
}

// Función para copiar código
function copiarCodigo(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        mostrarNotificacion('Código copiado al portapapeles', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarNotificacion('Error al copiar el código', 'danger');
    });
}

// Función para mostrar notificaciones pequeñas
function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.className = `mini-notification ${tipo}`;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    // Animación de entrada
    setTimeout(() => notif.classList.add('show'), 100);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
    // Mostrar alerta si hay una pendiente
    const alertMessage = sessionStorage.getItem("alertMessage");
    const alertType = sessionStorage.getItem("alertType");
    
    if (alertMessage && alertType) {
        setTimeout(() => {
            mostrarAlerta(alertMessage, alertType);
        }, 100);
        
        sessionStorage.removeItem("alertMessage");
        sessionStorage.removeItem("alertType");
    }

    if (document.querySelector('.form-container')) {
        setupFormValidation();
    }

    console.log("Configuración de logout completada.");
    console.log("DOM completamente cargado y analizado.");
    
    if (document.getElementById("login-form")) {
        console.log("Formulario de inicio de sesión encontrado.");
        logearUsuario();
    }

    if (document.getElementById("chat-messages")) {
        console.log("Inicializando chat...");
        
        const { chatMensajes, messageInput, sendButton } = inicializarChat();
        
        if (chatMensajes && messageInput && sendButton) {
            configurarChat(chatMensajes, messageInput, sendButton);
            configurarEnvioConEnter(messageInput, sendButton);
            
            // Cargar proyectos en el sidebar
            renderizarNombresProyectosSidebarChat();
            
            // NUEVO: Cargar historial del proyecto activo después de cargar proyectos
            setTimeout(() => {
                // Recuperar proyecto guardado o usar 'general' por defecto
                const proyectoGuardado = localStorage.getItem('proyectoActualChat');
                const proyectoACargar = proyectoGuardado || 'general';
                
                console.log("Cargando historial del proyecto:", proyectoACargar);
                cargarHistorialProyecto(proyectoACargar);
            }, 800); // Aumentar tiempo para asegurar que proyectos se carguen primero
        }
    }
    
    if (document.getElementById("crear-proyecto-form")) {
        cargarFormularioCrearProyecto();
    }

    if (document.getElementById("usuario-nuevo-form")) {
        cargarFormularioCrearUsuario();
    }

    console.log("Comprobando si el usuario está autenticado...");
    if (
        document.getElementById("proyectos-container") ||
        document.getElementById("usuarios-container")
    ) {
        cargarDatosPerfil();
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