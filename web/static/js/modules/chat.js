// Funcionalidad completa del chat

// Variables globales para el chat
let scrollObserverActivo = true;

// ==================== FUNCIONES DE SCROLL ====================

function scrollToBottom(container) {
    if (!container) return;
    const lastChild = container.lastElementChild;
    if (lastChild) {
        lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function scrollToBottomForzado(container) {
    if (!container) {
        container = document.querySelector('.chat-mensajes');
    }
    
    if (!container) return;
    
    // Método 1: Usar el contenedor padre con scroll
    const chatContainer = container.closest('.chat-messages-container');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Método 2: Usar el último elemento
    const lastChild = container.lastElementChild;
    if (lastChild) {
        lastChild.scrollIntoView({ 
            behavior: 'auto', // Scroll inmediato
            block: 'end',
            inline: 'nearest' 
        });
    }
    
    // Método 3: Forzar scroll en el contenedor principal
    const mainContainer = document.querySelector('.chat-wrapper');
    if (mainContainer) {
        const scrollableElement = mainContainer.querySelector('.chat-messages-container');
        if (scrollableElement) {
            scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
    }
    
    console.log("Scroll forzado ejecutado");
}

function scrollToBottomSuave(container) {
    if (!container) {
        container = document.querySelector('.chat-mensajes');
    }
    
    if (!container) return;
    
    const chatContainer = container.closest('.chat-messages-container');
    if (chatContainer) {
        // Scroll suave y controlado
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// ==================== CONFIGURACIÓN DEL CHAT ====================

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

            // Scroll suave al final
            scrollToBottomSuave(chatMensajes);

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

// ==================== COMUNICACIÓN CON EL SERVIDOR ====================

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
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(block);
                    }
                });
            }, 100);
            
            // Scroll suave al final
            scrollToBottomSuave(chatMensajes);
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

// ==================== INICIALIZACIÓN DEL CHAT ====================

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

    // Mostrar mensaje de bienvenida
    const mensajeBienvenida = document.createElement('div');
    mensajeBienvenida.classList.add('campo-bot');
    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="mensaje-bot">
            <div class="mensaje-contenido">
                <p>¡Hola! Soy tu asistente de IA especializado en desarrollo seguro. ¿En qué puedo ayudarte hoy?</p>
            </div>
        </div>
    `;
    chatMensajes.appendChild(mensajeBienvenida);
    
    // Configurar observer de scroll después de un breve delay
    setTimeout(() => {
        configurarScrollObserver();
    }, 500);
    
    scrollToBottomForzado(chatMensajes);

    return { chatMensajes, messageInput, sendButton };
}

// ==================== GESTIÓN DEL HISTORIAL ====================

async function cargarHistorialProyecto(proyectoId, hacerScroll = false) {
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

            // Cargar historial del proyecto
            const historial = data.historial;
            
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
                    
                    // Procesar código sin hacer scroll automático
                    setTimeout(() => {
                        const codeBlocks = botMessage.querySelectorAll('pre code');
                        codeBlocks.forEach(block => {
                            if (typeof hljs !== 'undefined') {
                                hljs.highlightElement(block);
                            }
                        });
                    }, 150);
                }
            }

            // Solo hacer scroll si se solicita explícitamente
            if (hacerScroll) {
                setTimeout(() => {
                    scrollToBottomForzado(chatMensajes);
                }, 300);
            }
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// ==================== GESTIÓN DE PROYECTOS EN SIDEBAR ====================

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
                
                // Pausar observer temporalmente
                pausarScrollObserver();
                
                const proyectoId = this.getAttribute('data-proyecto-id');
                proyectoActualChat = proyectoId;
                
                // Guardar el proyecto activo en localStorage
                localStorage.setItem('proyectoActualChat', proyectoId);
                
                // Actualizar selección visual
                actualizarProyectoSeleccionado(proyectoId);
                
                // Cargar historial SIN scroll automático
                cargarHistorialProyecto(proyectoId, false); // false = no hacer scroll
                
                actualizarInfoProyecto(proyectoId, proyectos);
            });
        });

        // Event listeners para eliminar
        sidebarChat.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const proyectoId = this.getAttribute('data-id');
                eliminarProyectoChat(proyectoId, this.closest('.proyecto-chat'));
            });
        });

        // Recuperar el proyecto activo desde localStorage
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

// ==================== FUNCIONES DE UTILIDAD DEL CHAT ====================

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

function limpiarChat() {
    const chatMensajes = document.querySelector('.chat-mensajes');
    if (chatMensajes) {
        chatMensajes.innerHTML = '';
        
        // Añadir mensaje de bienvenida
        const mensajeBienvenida = document.createElement('div');
        mensajeBienvenida.classList.add('campo-bot');
        mensajeBienvenida.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot"></i>
            </div>
            <div class="mensaje-bot">
                <div class="mensaje-contenido">
                    <p>¡Chat limpiado! ¿En qué puedo ayudarte ahora?</p>
                </div>
            </div>
        `;
        chatMensajes.appendChild(mensajeBienvenida);
        scrollToBottomSuave(chatMensajes);
    }
}

// ==================== SCROLL OBSERVER ====================

function configurarScrollObserver() {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (!chatContainer) return;
    
    const observer = new MutationObserver((mutations) => {
        // Solo hacer scroll si el observer está activo
        if (!scrollObserverActivo) return;
        
        let shouldScroll = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldScroll = true;
            }
        });
        
        if (shouldScroll) {
            setTimeout(() => {
                scrollToBottomSuave(); // Usar scroll suave
            }, 200);
        }
    });
    
    const chatMensajes = document.querySelector('.chat-mensajes');
    if (chatMensajes) {
        observer.observe(chatMensajes, {
            childList: true,
            subtree: true
        });
    }
    
    console.log("Scroll observer configurado");
}

function pausarScrollObserver() {
    scrollObserverActivo = false;
    setTimeout(() => {
        scrollObserverActivo = true;
    }, 1000); // Reactivar después de 1 segundo
}

// ==================== GESTIÓN DE PROYECTOS DESDE CHAT ====================

async function eliminarProyectoChat(proyectoId, elementoDOM) {
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
        
        // Mostrar alerta de éxito en el chat
        mostrarAlerta("Proyecto eliminado con éxito", "success", true);
        
        // Si el proyecto eliminado era el activo, cambiar a general
        const proyectoGuardado = localStorage.getItem('proyectoActualChat');
        if (proyectoGuardado == proyectoId) {
            localStorage.setItem('proyectoActualChat', 'general');
            proyectoActualChat = 'general';
            
            // Cambiar al chat general
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
        }
        
        // Remover del DOM
        if (elementoDOM) {
            elementoDOM.remove();
        }
        
        // Recargar la lista de proyectos en el sidebar
        setTimeout(() => {
            renderizarNombresProyectosSidebarChat();
        }, 1000);
        
    } catch (error) {
        console.error(error);
        mostrarAlerta("Hubo un error al eliminar el proyecto", "danger", true);
    }
}

// ==================== EXPORTACIÓN DE FUNCIONES ====================

// Para compatibilidad con otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scrollToBottom,
        scrollToBottomForzado,
        scrollToBottomSuave,
        configurarChat,
        configurarEnvioConEnter,
        sendMessageToServer,
        inicializarChat,
        cargarHistorialProyecto,
        renderizarNombresProyectosSidebarChat,
        actualizarProyectoSeleccionado,
        actualizarInfoProyecto,
        limpiarChat,
        configurarScrollObserver,
        pausarScrollObserver,
        eliminarProyectoChat
    };
}