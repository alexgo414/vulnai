function scrollToBottom(container) {
    const lastChild = container.lastElementChild;
    if (lastChild) {
        lastChild.scrollIntoView({ behavior: 'smooth',  block: 'nearest' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
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
});


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

// Funcionalidad del chat (Ejercicio 2 y 3)
sendButton.addEventListener('click', () => {
    const messageText = messageInput.value.trim();
    if (messageText !== '') {
        // Añadir mensaje del usuario (Ejercicio 2)
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

        // Enviar mensaje al servidor y mostrar respuesta (Ejercicio 3)
        sendMessageToServer(messageText, chatMensajes);
    }
});

// Enviar mensaje con la tecla Enter
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});

// Función para enviar el mensaje al servidor y mostrar la respuesta (Ejercicio 3)
async function sendMessageToServer(messageText, chatMensajes) {
    try {
        // Realizar la petición POST al servidor
        const response = await fetch('https://albertosalguero.eu.pythonanywhere.com/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageText }),
        });

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
// Base URL de la API
const API_BASE_URL = "http://localhost:5001";

// Función para obtener y renderizar usuarios
async function obtenerUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios`);
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

// Función para eliminar un usuario
async function eliminarUsuario(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Error al eliminar usuario: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Usuario eliminado:", resultado);
        obtenerUsuarios(); // Actualizar la lista de usuarios
    } catch (error) {
        console.error(error);
    }
}

// Función para obtener y renderizar proyectos
async function obtenerProyectos() {
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos`);
        if (!response.ok) {
            throw new Error(`Error al obtener proyectos: ${response.statusText}`);
        }
        const proyectos = await response.json();
        renderizarProyectos(proyectos);
    } catch (error) {
        console.error(error);
    }
}

// Función para eliminar un proyecto
async function eliminarProyecto(proyectoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error(`Error al eliminar proyecto: ${response.statusText}`);
        }
        const resultado = await response.json();
        console.log("Proyecto eliminado:", resultado);
        obtenerProyectos(); // Actualizar la lista de proyectos
    } catch (error) {
        console.error(error);
    }
}

// Función para renderizar usuarios en el HTML
function renderizarUsuarios(usuarios) {
    const usuariosContainer = document.querySelector(".row:nth-of-type(2)"); // Selecciona el contenedor de usuarios
    usuariosContainer.innerHTML = ""; // Limpia el contenido previo
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
            </div>
        `;
        usuariosContainer.appendChild(usuarioDiv);
    });
}

// Función para renderizar proyectos en el HTML
function renderizarProyectos(proyectos) {
    const proyectosContainer = document.querySelector(".row"); // Selecciona el contenedor de proyectos
    proyectosContainer.innerHTML = ""; // Limpia el contenido previo
    proyectos.forEach((proyecto) => {
        const proyectoDiv = document.createElement("div");
        proyectoDiv.classList.add("col-md-6", "col-lg-4", "mb-4");
        proyectoDiv.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary">${proyecto.nombre}</h5>
                    <p class="card-text">${proyecto.descripcion}</p>
                    <p class="text-muted">
                        <strong>Propietario:</strong> ${proyecto.propietario?.username || "Sin propietario"} <br>
                        <strong>Fecha de creación:</strong> ${proyecto.fecha_creacion} <br>
                        <strong>Fecha de modificación:</strong> ${proyecto.fecha_modificacion}
                    </p>
                </div>
            </div>
        `;
        proyectosContainer.appendChild(proyectoDiv);
    });
}

// Función para obtener un proyecto por ID
async function obtenerProyectoPorId(proyectoId) {
    try {
        const response = await fetch(`http://localhost:5001/proyectos/${proyectoId}`);
        if (!response.ok) {
            throw new Error(`Error al obtener el proyecto: ${response.statusText}`);
        }
        const proyecto = await response.json();
        return proyecto;
    } catch (error) {
        console.error(error);
        alert("Hubo un error al obtener el proyecto.");
    }
}

// Función para manejar la edición del proyecto
async function editarProyecto(proyectoId) {
    const proyecto = await obtenerProyectoPorId(proyectoId);
    if (proyecto) {
        // Almacenar el proyecto en localStorage
        localStorage.setItem("proyectoEditar", JSON.stringify(proyecto));
        // Redirigir a la página de edición
        window.location.href = `/perfil/proyecto_editar/${proyectoId}`;
    }
}

// Función para crear un nuevo proyecto
async function crearProyecto(proyecto) {
    console.log("Datos enviados al servidor:", proyecto);
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(proyecto),
        });

        console.log("Respuesta del servidor:", response);
        if (!response.ok) {
            throw new Error(`Error al crear proyecto: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Proyecto creado:", resultado);
        return resultado; // Devolver el resultado si es necesario
    } catch (error) {
        console.error("Error al crear el proyecto:", error);
        throw error; // Lanzar el error para que pueda ser manejado por el código que llama a esta función
    }
}

// Manejar el envío del formulario al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("crear-proyecto-form");

    // Obtener el usuario_id desde la API
    let usuarioId;
    try {
        const response = await fetch("http://localhost:5001/api/usuario_actual");
        if (!response.ok) {
            throw new Error("Error al obtener el usuario actual");
        }
        const data = await response.json();
        usuarioId = data.usuario_id;
    } catch (error) {
        console.error("Error al obtener el usuario actual:", error);
        alert("No se pudo obtener el usuario actual");
        return;
    }

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
            fecha_creacion: new Date().toISOString().split("T")[0], // Fecha actual
            fecha_modificacion: new Date().toISOString().split("T")[0], // Fecha actual
            usuario_id: usuarioId // Usar el usuario_id obtenido de la API
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
});

// Llamar a las funciones iniciales para cargar datos
document.addEventListener("DOMContentLoaded", () => {
    obtenerProyectos();
    obtenerUsuarios();
});