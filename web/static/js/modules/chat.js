import { fetchWithCredentials, API_BASE_URL_CHAT, API_BASE_URL } from './api.js';
import { mostrarToast } from './alerts.js';
import { scrollToBottom } from './animations.js';

let proyectoActualChat = null;
let chatMensajes = null;
let messageInput = null;
let sendButton = null;

function configurarChat(chatMensajes, messageInput, sendButton) {
    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
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

            messageInput.value = '';

            scrollToBottom(chatMensajes);

            sendMessageToServer(messageText, chatMensajes);
        }
    });
}

function configurarEnvioConEnter(messageInput, sendButton) {
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });
}

async function sendMessageToServer(messageText, chatMensajes) {
    try {
        console.log("🚀 Enviando mensaje autenticado:", messageText);
        
        console.log("🍪 Cookies disponibles:", document.cookie);
        
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

async function cargarProyectosSidebar() {
    const sidebarChat = document.getElementById("proyectos-sidebar");
    if (!sidebarChat) {
        console.error("No se encontró el elemento proyectos-sidebar");
        return;
    }

    console.log("Cargando proyectos para el sidebar...");

    try {
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
                        data-proyecto-id="${proyecto.id}"
                        title="Eliminar proyecto">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        const projectInfo = proyectoElement.querySelector('.project-info');
        projectInfo.addEventListener('click', () => {
            seleccionarProyecto(proyecto);
        });
        
        const deleteButton = proyectoElement.querySelector('.btn-delete-project');
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarProyectoChat(proyecto.id);
        });
        
        sidebarChat.appendChild(proyectoElement);
    });

    console.log(`${proyectos.length} proyectos renderizados en el sidebar`);
}

async function eliminarProyectoChat(proyectoId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.")) {
        return;
    }
    
    console.log("Eliminando proyecto desde chat:", proyectoId);
    
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al eliminar proyecto: ${response.statusText}`);
        }
        
        mostrarToast("Proyecto eliminado con éxito", "success");
        
        if (proyectoActualChat && proyectoActualChat.id == proyectoId) {
            resetearChat();
        }
        
        cargarProyectosSidebar();
        
    } catch (error) {
        console.error("Error al eliminar proyecto:", error);
        mostrarToast(`Error: ${error.message}`, "danger");
    }
}

function resetearChat() {
    proyectoActualChat = null;
    
    if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = "Selecciona un proyecto para empezar a chatear...";
    }
    
    if (sendButton) {
        sendButton.disabled = true;
    }
    
    const fileUploadBtn = document.getElementById('file-upload-btn');
    if (fileUploadBtn) {
        fileUploadBtn.style.display = 'none';
    }
    
    const projectName = document.getElementById('current-project-name');
    const projectStatus = document.getElementById('current-project-status');
    
    if (projectName) projectName.textContent = "Selecciona un proyecto";
    if (projectStatus) projectStatus.textContent = "Para comenzar a chatear";
    
    if (chatMensajes) {
        chatMensajes.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3>¡Bienvenido al Chat!</h3>
                <p>Selecciona un proyecto de la barra lateral para comenzar a chatear con la IA sobre ese proyecto específico. También puedes subir archivos SBOM para análisis.</p>
            </div>
        `;
    }
}

function seleccionarProyecto(proyecto) {
    proyectoActualChat = proyecto;
    
    console.log("Proyecto seleccionado:", proyecto);
    
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-proyecto-id="${proyecto.id}"]`).classList.add('active');
    
    document.getElementById('current-project-name').textContent = proyecto.nombre;
    document.getElementById('current-project-status').textContent = 
        `Chat activo • ${proyecto.descripcion || 'Sin descripción'}`;
    
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Pregunta sobre "${proyecto.nombre}" o sube un archivo SBOM...`;
    }
    
    if (sendButton) {
        sendButton.disabled = false;
    }
    
    if (fileUploadBtn) {
        fileUploadBtn.style.display = 'flex';
    }
    
    limpiarChatSilencioso();
    agregarMensajeAlChat(
        `¡Hola! Ahora estamos hablando sobre el proyecto "${proyecto.nombre}". Puedes hacerme preguntas o subir archivos SBOM para análisis. ¿En qué puedo ayudarte?`, 
        'bot'
    );
    
    mostrarToast(`Chat iniciado para "${proyecto.nombre}"`, "success", 2000);
}

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

function limpiarChatSilencioso() {
    if (chatMensajes) {
        const welcomeMessage = chatMensajes.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messages = chatMensajes.querySelectorAll('.message-group');
        messages.forEach(msg => msg.remove());
    }
}

function configurarEventosChat() {
    sendButton.addEventListener('click', enviarMensaje);
    
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            enviarMensaje();
        }
    });
    
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', manejarArchivoSBOM);
    }
}

function enviarMensaje() {
    if (!proyectoActualChat) {
        mostrarToast("Selecciona un proyecto primero", "warning");
        return;
    }

    const messageText = messageInput.value.trim();
    if (messageText === '') return;

    agregarMensajeAlChat(messageText, 'user');
    
    messageInput.value = '';
    
    enviarMensajeAlServidor(messageText);
}

function agregarMensajeAlChat(mensaje, tipo) {
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${tipo}`;
    
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let mensajeProcesado = mensaje;
    
    if (tipo === 'bot') {
        try {
            if (typeof marked !== 'undefined') {
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                    smartypants: true
                });
                mensajeProcesado = marked.parse(mensaje);
            } else {
                mensajeProcesado = procesarMarkdownBasico(mensaje);
            }
            
            if (typeof DOMPurify !== 'undefined') {
                mensajeProcesado = DOMPurify.sanitize(mensajeProcesado, {
                    ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
                    ALLOWED_ATTR: []
                });
            }
        } catch (error) {
            console.warn("Error procesando markdown:", error);
            mensajeProcesado = mensaje.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }
    } else {
        mensajeProcesado = mensaje.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
    
    messageGroup.innerHTML = `
        <div class="message-avatar ${tipo}">
            <i class="fas fa-${tipo === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble ${tipo}">
                ${mensajeProcesado}
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;
    
    chatMensajes.appendChild(messageGroup);
    scrollToBottom();
}

export function inicializarChat() {
    console.log("Inicializando chat...");
    
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

    configurarEventosChat();
    
    cargarProyectosSidebar();

    console.log("Chat inicializado correctamente");
    return { chatMensajes, messageInput, sendButton };
}

function mostrarInformacionSBOM(sbomInfo, limitesInfo = null) {
    if (!sbomInfo) return;
    
    let mensaje = `**Archivo procesado:** ${sbomInfo.filename}\n`;
    mensaje += `**Formato:** ${sbomInfo.formato}\n`;
    mensaje += `**Componentes:** ${sbomInfo.componentes}\n`;
    
    if (sbomInfo.nvd_analysis) {
        const nvd = sbomInfo.nvd_analysis;
        mensaje += `\n**🔍 Análisis de Vulnerabilidades (NVD):**\n`;
        mensaje += `• Componentes analizados: ${nvd.componentes_analizados}\n`;
        mensaje += `• Vulnerabilidades encontradas: ${nvd.vulnerabilidades_encontradas}\n`;
        mensaje += `• Componentes vulnerables: ${nvd.componentes_vulnerables}\n`;
        
        // ✅ MOSTRAR INFORMACIÓN DE FILTRADO CORRECTA
        if (nvd.filtros_aplicados) {
            mensaje += `\n**⚙️ Filtros del proyecto aplicados:**\n`;
            mensaje += `• Umbral de seguridad: ${nvd.filtros_aplicados.umbral_seguridad} vulnerabilidades\n`;
            mensaje += `• Severidad máxima permitida: ${nvd.filtros_aplicados.max_severidad_permitida}\n`;
            
            if (nvd.total_vulnerabilidades_brutas) {
                mensaje += `• Total vulnerabilidades brutas encontradas: ${nvd.total_vulnerabilidades_brutas}\n`;
                mensaje += `• Vulnerabilidades excluidas por severidad: ${nvd.vulnerabilidades_excluidas || 0}\n`;
            }
        }
        
        // ✅ EVALUACIÓN DE SEGURIDAD DEL PROYECTO
        const vulnerabilidades_encontradas = nvd.vulnerabilidades_encontradas; // ✅ NÚMERO REAL
        const umbral_seguridad = nvd.filtros_aplicados?.umbral_seguridad || 10; // ✅ UMBRAL DE SEGURIDAD
        
        if (vulnerabilidades_encontradas === 0) {
            mensaje += `\n✅ **Excelente:** No se encontraron vulnerabilidades dentro de los criterios del proyecto.`;
        } else if (vulnerabilidades_encontradas <= umbral_seguridad) {
            mensaje += `\n✅ **Proyecto seguro:** Se encontraron ${vulnerabilidades_encontradas} vulnerabilidades, lo cual está dentro del umbral de seguridad (${umbral_seguridad}).`;
        } else {
            mensaje += `\n🚨 **Proyecto en riesgo:** Se encontraron ${vulnerabilidades_encontradas} vulnerabilidades, superando el umbral de seguridad de ${umbral_seguridad}.`;
        }
        
        // ✅ INFORMACIÓN DE EXCLUSIONES SI LAS HAY
        if (nvd.vulnerabilidades_excluidas > 0) {
            mensaje += `\n\n📊 **Vulnerabilidades excluidas por severidad:** ${nvd.vulnerabilidades_excluidas}`;
            
            if (nvd.severidades_excluidas_count) {
                mensaje += `\n**Distribución de excluidas por severidad:**\n`;
                for (const [severidad, cantidad] of Object.entries(nvd.severidades_excluidas_count)) {
                    const emoji = {
                        'CRITICAL': '🔴',
                        'HIGH': '🟠', 
                        'MEDIUM': '🟡',
                        'LOW': '🟢',
                        'UNKNOWN': '⚪'
                    }[severidad] || '⚪';
                    mensaje += `• ${emoji} ${severidad}: ${cantidad} (excluidas por severidad)\n`;
                }
            }
        }
    }
    
    agregarMensajeAlChat(mensaje, 'bot');
}

// ✅ FUNCIÓN PARA MOSTRAR INDICADOR DE ESCRITURA
function mostrarIndicadorEscribiendo() {
    const indicadorId = 'typing-indicator';
    
    // Evitar duplicados
    const existingIndicator = document.getElementById(indicadorId);
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const typingIndicator = document.createElement('div');
    typingIndicator.id = indicadorId;
    typingIndicator.className = 'message-group bot typing-indicator';
    
    typingIndicator.innerHTML = `
        <div class="message-avatar bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble bot typing-bubble">
                <div class="typing-animation">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
                <span class="typing-text">La IA está escribiendo...</span>
            </div>
        </div>
    `;
    
    chatMensajes.appendChild(typingIndicator);
    scrollToBottom();
    
    return typingIndicator;
}

// ✅ FUNCIÓN PARA OCULTAR INDICADOR
function ocultarIndicadorEscribiendo() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        // Animación suave de salida
        indicator.style.opacity = '0';
        indicator.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 200);
    }
}

// ✅ MODIFICAR LA FUNCIÓN DE ENVÍO DE MENSAJES
async function enviarMensajeAlServidor(messageText) {
    // Mostrar indicador antes de enviar
    const typingIndicator = mostrarIndicadorEscribiendo();
    
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

        // ✅ OCULTAR INDICADOR ANTES DE MOSTRAR RESPUESTA
        ocultarIndicadorEscribiendo();
        
        // Pequeña pausa para suavizar la transición
        setTimeout(() => {
            agregarMensajeAlChat(data.message, 'bot');
        }, 100);
        
    } catch (error) {
        console.error("❌ Error en el chat:", error);
        
        // ✅ OCULTAR INDICADOR EN CASO DE ERROR
        ocultarIndicadorEscribiendo();
        
        setTimeout(() => {
            agregarMensajeAlChat(
                `🚫 Error: ${error.message}. Verifica tu conexión.`, 
                'bot'
            );
        }, 100);
    }
}

// ✅ MODIFICAR LA FUNCIÓN DE MANEJO DE SBOM
async function manejarArchivoSBOM(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!proyectoActualChat) {
        mostrarToast("Selecciona un proyecto primero", "warning");
        return;
    }
    
    const allowedTypes = ['json', 'xml', 'yaml', 'yml', 'spdx', 'txt'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        mostrarToast("Tipo de archivo no soportado. Usa: JSON, XML, YAML, SPDX, TXT", "danger");
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        mostrarToast("Archivo demasiado grande. Máximo 16MB", "danger");
        return;
    }
    
    try {
        agregarMensajeAlChat(`📁 Subiendo archivo SBOM: ${file.name}...\n🔍 Consultando National Vulnerability Database...`, 'user');
        
        // ✅ MOSTRAR INDICADOR PERSONALIZADO PARA SBOM
        const typingIndicator = mostrarIndicadorProcesandoSBOM();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('proyecto_id', proyectoActualChat.id);
        formData.append('limite_vulnerabilidades', proyectoActualChat.max_vulnerabilidades || 10); 
        formData.append('max_severidad', proyectoActualChat.max_severidad || 'MEDIUM');
        formData.append('mensaje', `Analiza este archivo SBOM del proyecto ${proyectoActualChat.nombre}`);
        
        const response = await fetch(`${API_BASE_URL_CHAT}/chat/upload-sbom`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Archivo SBOM procesado:", data);
        
        // ✅ OCULTAR INDICADOR DE PROCESAMIENTO
        ocultarIndicadorEscribiendo();
        
        // ✅ MOSTRAR INFORMACIÓN DEL SBOM SIN ALERTAS
        if (data.sbom_info) {
            setTimeout(() => {
                mostrarInformacionSBOM(data.sbom_info); // Sin segundo parámetro
            }, 100);
        }
        
        // ✅ RESPUESTA DE LA IA
        setTimeout(() => {
            agregarMensajeAlChat(data.message, 'bot');
        }, 200);
        
        // ✅ TOAST SIMPLE DE ÉXITO
        mostrarToast("Archivo SBOM procesado correctamente", "success", 3000);
        
        event.target.value = '';
        
    } catch (error) {
        console.error("❌ Error subiendo SBOM:", error);
        
        // ✅ OCULTAR INDICADOR EN CASO DE ERROR
        ocultarIndicadorEscribiendo();
        
        setTimeout(() => {
            agregarMensajeAlChat(
                `🚫 Error procesando archivo SBOM: ${error.message}`, 
                'bot'
            );
        }, 100);
        
        event.target.value = '';
    }
}

// ✅ INDICADOR ESPECIAL PARA PROCESAMIENTO DE SBOM
function mostrarIndicadorProcesandoSBOM() {
    const indicadorId = 'typing-indicator';
    
    // Evitar duplicados
    const existingIndicator = document.getElementById(indicadorId);
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const typingIndicator = document.createElement('div');
    typingIndicator.id = indicadorId;
    typingIndicator.className = 'message-group bot typing-indicator';
    
    typingIndicator.innerHTML = `
        <div class="message-avatar bot">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble bot typing-bubble processing">
                <div class="processing-animation">
                    <i class="fas fa-cog fa-spin"></i>
                    <i class="fas fa-file-code fa-pulse"></i>
                    <i class="fas fa-shield-alt fa-beat"></i>
                </div>
                <span class="typing-text">Procesando SBOM y analizando vulnerabilidades...</span>
                <div class="processing-steps">
                    <div class="step active">📁 Leyendo archivo</div>
                    <div class="step">🔍 Consultando NVD</div>
                    <div class="step">🎯 Aplicando criterios</div>
                    <div class="step">📊 Generando análisis</div>
                </div>
            </div>
        </div>
    `;
    
    chatMensajes.appendChild(typingIndicator);
    scrollToBottom();
    
    // ✅ ANIMAR PASOS DEL PROCESAMIENTO
    animarPasosProcesamiento();
    
    return typingIndicator;
}

// ✅ FUNCIÓN PARA ANIMAR LOS PASOS
function animarPasosProcesamiento() {
    const steps = document.querySelectorAll('.processing-steps .step');
    if (steps.length === 0) return;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
        // Remover active de todos
        steps.forEach(step => step.classList.remove('active'));
        
        // Agregar active al actual
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        } else {
            // Reiniciar el ciclo
            currentStep = 0;
        }
    }, 1500); // Cambiar cada 1.5 segundos
    
    // Limpiar interval después de 10 segundos
    setTimeout(() => {
        clearInterval(interval);
    }, 10000);
}