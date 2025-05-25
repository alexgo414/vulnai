// Gestión de Proyectos

// ==================== CONFIGURACIÓN Y CONSTANTES ====================
const API_BASE_URL = "http://localhost:5001";

// ==================== FUNCIONES PRINCIPALES ====================

// Función para obtener todos los proyectos
async function obtenerProyectos() {
    try {
        const [proyectosRes, usuariosRes] = await Promise.all([
            fetch(`${API_BASE_URL}/proyectos`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            }),
            fetch(`${API_BASE_URL}/usuarios`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            })
        ]);

        if (!proyectosRes.ok || !usuariosRes.ok) {
            throw new Error('Error al obtener datos del servidor');
        }

        const proyectos = await proyectosRes.json();
        const usuarios = await usuariosRes.json();
        
        console.log("Proyectos obtenidos:", proyectos);
        console.log("Usuarios obtenidos:", usuarios);
        
        return { proyectos, usuarios };
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        throw error;
    }
}

// Función para obtener un proyecto específico por ID
async function obtenerProyectoPorId(proyectoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Proyecto no encontrado');
            }
            throw new Error(`Error al obtener el proyecto: ${response.statusText}`);
        }

        const proyecto = await response.json();
        console.log("Proyecto obtenido:", proyecto);
        return proyecto;
    } catch (error) {
        console.error('Error al obtener proyecto:', error);
        throw error;
    }
}

// Función para crear un nuevo proyecto
async function crearProyecto(datosProyecto) {
    console.log("Creando proyecto:", datosProyecto);
    
    try {
        // Validar datos antes de enviar
        if (!datosProyecto.nombre || datosProyecto.nombre.trim() === '') {
            throw new Error('El nombre del proyecto es obligatorio');
        }

        const response = await fetch(`${API_BASE_URL}/proyectos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                nombre: datosProyecto.nombre.trim(),
                descripcion: datosProyecto.descripcion ? datosProyecto.descripcion.trim() : ''
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al crear proyecto: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Proyecto creado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al crear proyecto:', error);
        throw error;
    }
}

// Función para actualizar un proyecto
async function actualizarProyecto(proyectoId, datosActualizados) {
    console.log("Actualizando proyecto:", proyectoId, datosActualizados);
    
    try {
        // Validar datos antes de enviar
        if (!datosActualizados.nombre || datosActualizados.nombre.trim() === '') {
            throw new Error('El nombre del proyecto es obligatorio');
        }

        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                nombre: datosActualizados.nombre.trim(),
                descripcion: datosActualizados.descripcion ? datosActualizados.descripcion.trim() : ''
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al actualizar proyecto: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Proyecto actualizado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        throw error;
    }
}

// Función para eliminar un proyecto
async function eliminarProyecto(proyectoId) {
    console.log("Eliminando proyecto:", proyectoId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/proyectos/${proyectoId}`, {
            method: "DELETE",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al eliminar proyecto: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Proyecto eliminado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        throw error;
    }
}

// ==================== RENDERIZACIÓN Y UI ====================

// Función para renderizar lista de proyectos
function renderizarProyectos(proyectos, usuarios = []) {
    const proyectosContainer = document.getElementById("proyectos-container");
    if (!proyectosContainer) return;
    
    // Limpiar contenedor
    proyectosContainer.innerHTML = "";
    
    // Verificar si hay proyectos
    if (!proyectos || proyectos.length === 0) {
        renderizarEstadoVacio(proyectosContainer);
        return;
    }

    // Renderizar cada proyecto
    proyectos.forEach((proyecto, index) => {
        const propietario = usuarios.find(usuario => usuario.id === proyecto.usuario_id);
        const proyectoElement = crearElementoProyecto(proyecto, propietario, index);
        proyectosContainer.appendChild(proyectoElement);
    });
    
    // Configurar event listeners
    configurarEventListenersProyectos();
}

// Función para crear elemento DOM de un proyecto
function crearElementoProyecto(proyecto, propietario, index) {
    const propietarioNombre = propietario ? propietario.username : "Desconocido";
    
    const proyectoDiv = document.createElement("div");
    proyectoDiv.classList.add("col-lg-6", "col-xl-4", "mb-4");
    proyectoDiv.style.animationDelay = `${index * 0.1}s`;
    proyectoDiv.setAttribute('data-proyecto-id', proyecto.id);
    
    proyectoDiv.innerHTML = `
        <div class="card h-100 project-card">
            <div class="card-header project-header">
                <div class="project-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <div class="project-actions">
                    <button class="btn btn-sm btn-outline-light btn-project-chat" 
                            data-proyecto-id="${proyecto.id}" 
                            title="Abrir en chat">
                        <i class="fas fa-comments"></i>
                    </button>
                </div>
            </div>
            
            <div class="card-body">
                <h5 class="card-title project-title">${escapeHtml(proyecto.nombre)}</h5>
                <p class="card-text project-description">${escapeHtml(proyecto.descripcion || 'Sin descripción')}</p>
                
                <div class="project-meta">
                    <div class="meta-item">
                        <i class="fas fa-user me-2"></i>
                        <span><strong>Propietario:</strong> ${escapeHtml(propietarioNombre)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar-plus me-2"></i>
                        <span><strong>Creado:</strong></span>
                        <div class="fecha-info">${formatearFecha(proyecto.fecha_creacion)}</div>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-edit me-2"></i>
                        <span><strong>Modificado:</strong></span>
                        <div class="fecha-info">${formatearFecha(proyecto.fecha_modificacion)}</div>
                    </div>
                </div>
            </div>
            
            <div class="card-footer project-footer">
                <div class="project-actions-footer">
                    <button class="btn btn-primary btn-editar-proyecto" 
                            data-proyecto-id="${proyecto.id}">
                        <i class="fas fa-edit me-2"></i>Editar
                    </button>
                    <button class="btn btn-danger btn-eliminar-proyecto" 
                            data-proyecto-id="${proyecto.id}">
                        <i class="fas fa-trash me-2"></i>Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return proyectoDiv;
}

// Función para renderizar estado vacío
function renderizarEstadoVacio(container) {
    container.innerHTML = `
        <div class="col-12">
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="empty-state-title">No hay proyectos</h3>
                <p class="empty-state-description">
                    Crea tu primer proyecto para comenzar a trabajar con nuestra IA especializada en desarrollo seguro.
                </p>
                <div class="empty-state-actions">
                    <a href="/perfil/proyecto_nuevo" class="btn btn-primary btn-lg">
                        <i class="fas fa-plus me-2"></i>Crear Mi Primer Proyecto
                    </a>
                    <a href="/chat" class="btn btn-outline-primary btn-lg">
                        <i class="fas fa-comments me-2"></i>Ir al Chat General
                    </a>
                </div>
            </div>
        </div>
    `;
}

// ==================== FORMULARIOS ====================

// Función para configurar formulario de crear proyecto
function configurarFormularioCrearProyecto() {
    const form = document.getElementById("crear-proyecto-form");
    if (!form) return;

    // Configurar validación en tiempo real
    configurarValidacionFormulario(form);

    // Manejar envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const nombreInput = document.getElementById("nombre");
        const descripcionInput = document.getElementById("descripcion");

        // Validar formulario
        if (!validarFormularioProyecto(nombreInput, descripcionInput)) {
            return;
        }

        // Mostrar estado de carga
        mostrarCargandoFormulario(submitBtn, true);

        try {
            const datosProyecto = {
                nombre: nombreInput.value,
                descripcion: descripcionInput.value
            };

            await crearProyecto(datosProyecto);
            
            // Determinar redirección según origen
            const referrer = document.referrer;
            if (referrer.includes('/chat')) {
                // Notificar al chat que se creó un proyecto
                if (typeof renderizarNombresProyectosSidebarChat === 'function') {
                    setTimeout(() => {
                        renderizarNombresProyectosSidebarChat();
                    }, 1000);
                }
                
                mostrarExito("¡Proyecto creado con éxito! Ya puedes seleccionarlo en el chat.");
                
                setTimeout(() => {
                    window.location.href = "/chat";
                }, 2000);
            } else {
                sessionStorage.setItem("alertMessage", "¡Proyecto creado con éxito!");
                sessionStorage.setItem("alertType", "success");
                window.location.href = "/perfil";
            }

        } catch (error) {
            console.error("Error al crear proyecto:", error);
            mostrarError(error.message || "Error al crear el proyecto");
        } finally {
            mostrarCargandoFormulario(submitBtn, false);
        }
    });
}

// Función para configurar formulario de editar proyecto
function configurarFormularioEditarProyecto(proyectoId) {
    console.log("Configurando formulario de edición para proyecto:", proyectoId);
    
    // Cargar datos del proyecto y mostrar formulario
    cargarYMostrarFormularioEdicion(proyectoId);
}

// Función para cargar y mostrar formulario de edición
async function cargarYMostrarFormularioEdicion(proyectoId) {
    const container = document.getElementById("proyecto-editar-container");
    if (!container) {
        console.error("Container de edición no encontrado");
        return;
    }

    try {
        // Mostrar loading
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                </div>
                <p>Cargando datos del proyecto...</p>
            </div>
        `;

        // Obtener datos del proyecto
        const proyecto = await obtenerProyectoPorId(proyectoId);
        
        if (!proyecto) {
            throw new Error("Proyecto no encontrado");
        }

        // Mostrar formulario de edición
        mostrarFormularioEdicion(container, proyecto);

    } catch (error) {
        console.error("Error al cargar proyecto para edición:", error);
        
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                </div>
                <h3>Error al cargar el proyecto</h3>
                <p>${error.message}</p>
                <div class="error-actions">
                    <a href="/perfil" class="btn btn-primary">
                        <i class="fas fa-arrow-left me-2"></i>Volver al Perfil
                    </a>
                </div>
            </div>
        `;
    }
}

// Función para mostrar formulario de edición
function mostrarFormularioEdicion(container, proyecto) {
    container.innerHTML = `
        <div class="form-card">
            <div class="form-card-header">
                <div class="form-icon">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <h3 class="form-title">Editar Proyecto</h3>
                <p class="form-subtitle">Actualiza la información de: <strong>${escapeHtml(proyecto.nombre)}</strong></p>
            </div>
            
            <div class="form-card-body">
                <form id="editar-proyecto-form" novalidate>
                    <div class="form-group">
                        <label for="nombre" class="form-label required">
                            <i class="fas fa-tag me-2"></i>Nombre del Proyecto
                        </label>
                        <input type="text" 
                               id="nombre" 
                               name="nombre" 
                               class="form-control" 
                               required 
                               value="${escapeHtml(proyecto.nombre)}"
                               placeholder="Ingresa el nombre del proyecto">
                        <div class="invalid-feedback">
                            El nombre del proyecto es obligatorio.
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="descripcion" class="form-label">
                            <i class="fas fa-align-left me-2"></i>Descripción
                        </label>
                        <textarea id="descripcion" 
                                  name="descripcion" 
                                  class="form-control" 
                                  rows="4"
                                  placeholder="Describe brevemente el proyecto (opcional)">${escapeHtml(proyecto.descripcion || '')}</textarea>
                        <div class="form-help">
                            Opcional: Proporciona una descripción para ayudar a identificar el proyecto.
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-save me-2"></i>
                            <span class="btn-text">Guardar Cambios</span>
                            <span class="btn-loading">
                                <i class="fas fa-spinner fa-spin me-2"></i>Guardando...
                            </span>
                        </button>
                        <a href="/perfil" class="btn btn-secondary btn-lg">
                            <i class="fas fa-times me-2"></i>Cancelar
                        </a>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Configurar el formulario
    const form = document.getElementById("editar-proyecto-form");
    configurarValidacionFormulario(form);

    // Manejar envío
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const nombreInput = document.getElementById("nombre");
        const descripcionInput = document.getElementById("descripcion");

        // Validar formulario
        if (!validarFormularioProyecto(nombreInput, descripcionInput)) {
            return;
        }

        // Mostrar estado de carga
        mostrarCargandoFormulario(submitBtn, true);

        try {
            const datosActualizados = {
                nombre: nombreInput.value,
                descripcion: descripcionInput.value
            };

            await actualizarProyecto(proyecto.id, datosActualizados);

            sessionStorage.setItem("alertMessage", "¡Proyecto actualizado con éxito!");
            sessionStorage.setItem("alertType", "success");
            window.location.href = "/perfil";

        } catch (error) {
            console.error("Error al actualizar proyecto:", error);
            mostrarError(error.message || "Error al actualizar el proyecto");
        } finally {
            mostrarCargandoFormulario(submitBtn, false);
        }
    });
}

// ==================== EVENT LISTENERS ====================

// Función para configurar event listeners de proyectos
function configurarEventListenersProyectos() {
    // Botones de editar
    document.querySelectorAll('.btn-editar-proyecto').forEach(btn => {
        btn.addEventListener('click', function() {
            const proyectoId = this.getAttribute('data-proyecto-id');
            window.location.href = `/perfil/proyecto_editar/${proyectoId}`;
        });
    });

    // Botones de eliminar
    document.querySelectorAll('.btn-eliminar-proyecto').forEach(btn => {
        btn.addEventListener('click', function() {
            const proyectoId = this.getAttribute('data-proyecto-id');
            const proyectoCard = this.closest('[data-proyecto-id]');
            manejarEliminacionProyecto(proyectoId, proyectoCard);
        });
    });

    // Botones de ir al chat
    document.querySelectorAll('.btn-project-chat').forEach(btn => {
        btn.addEventListener('click', function() {
            const proyectoId = this.getAttribute('data-proyecto-id');
            irAlChatProyecto(proyectoId);
        });
    });
}

// Función para manejar eliminación de proyecto
async function manejarEliminacionProyecto(proyectoId, elementoDOM) {
    // Mostrar confirmación
    const confirmacion = await mostrarConfirmacionPersonalizada(
        "¿Eliminar proyecto?",
        "Esta acción no se puede deshacer. Se eliminará el proyecto y todo su historial de chat.",
        "Eliminar",
        "Cancelar"
    );

    if (!confirmacion) return;

    try {
        await eliminarProyecto(proyectoId);
        
        // Manejar UI según contexto
        const isInChat = document.querySelector('.chat-container') !== null;
        
        if (isInChat) {
            mostrarExito("Proyecto eliminado con éxito");
            
            // Si era el proyecto activo, cambiar a general
            const proyectoGuardado = localStorage.getItem('proyectoActualChat');
            if (proyectoGuardado == proyectoId) {
                localStorage.setItem('proyectoActualChat', 'general');
                
                // Actualizar chat
                if (typeof actualizarProyectoSeleccionado === 'function') {
                    actualizarProyectoSeleccionado('general');
                }
                if (typeof cargarHistorialProyecto === 'function') {
                    cargarHistorialProyecto('general');
                }
                
                // Recargar sidebar
                if (typeof renderizarNombresProyectosSidebarChat === 'function') {
                    setTimeout(() => {
                        renderizarNombresProyectosSidebarChat();
                    }, 1000);
                }
            }
        } else {
            mostrarExito("Proyecto eliminado con éxito");
        }
        
        // Remover elemento del DOM con animación
        if (elementoDOM) {
            elementoDOM.style.transform = 'scale(0)';
            elementoDOM.style.opacity = '0';
            setTimeout(() => {
                elementoDOM.remove();
                
                // Verificar si quedan proyectos
                const contenedor = document.getElementById('proyectos-container');
                const proyectosRestantes = contenedor.querySelectorAll('[data-proyecto-id]');
                if (proyectosRestantes.length === 0) {
                    renderizarEstadoVacio(contenedor);
                }
            }, 300);
        }

    } catch (error) {
        console.error("Error al eliminar proyecto:", error);
        mostrarError(error.message || "Error al eliminar el proyecto");
    }
}

// Función para ir al chat de un proyecto específico
function irAlChatProyecto(proyectoId) {
    // Guardar el proyecto seleccionado
    localStorage.setItem('proyectoActualChat', proyectoId);
    
    // Redirigir al chat
    window.location.href = '/chat';
}

// ==================== VALIDACIÓN ====================

// Función para configurar validación de formularios
function configurarValidacionFormulario(form) {
    const inputs = form.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        // Validación en tiempo real
        input.addEventListener('blur', function() {
            validarCampo(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('is-invalid')) {
                validarCampo(this);
            }
        });
    });
}

// Función para validar un campo individual
function validarCampo(campo) {
    const valor = campo.value.trim();
    const esRequerido = campo.hasAttribute('required');
    
    // Limpiar clases previas
    campo.classList.remove('is-valid', 'is-invalid');
    
    if (esRequerido && !valor) {
        campo.classList.add('is-invalid');
        return false;
    }
    
    if (valor) {
        campo.classList.add('is-valid');
    }
    
    return true;
}

// Función para validar formulario de proyecto
function validarFormularioProyecto(nombreInput, descripcionInput) {
    let esValido = true;
    
    // Validar nombre (requerido)
    if (!validarCampo(nombreInput)) {
        esValido = false;
    }
    
    // Validar descripción (opcional, pero verificar longitud si se proporciona)
    if (descripcionInput.value.trim().length > 500) {
        descripcionInput.classList.add('is-invalid');
        esValido = false;
    } else if (descripcionInput.value.trim().length > 0) {
        descripcionInput.classList.add('is-valid');
    }
    
    return esValido;
}

// ==================== UTILIDADES ====================

// Función para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Función para formatear fechas
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
            <div class="fecha-container">
                <div class="fecha-relativa">${textoRelativo}</div>
                <div class="fecha-exacta">${fechaExacta}</div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error parseando fecha:', fechaString, error);
        return 'Error en fecha';
    }
}

// Función para mostrar estado de carga en formularios
function mostrarCargandoFormulario(boton, cargando) {
    const textoNormal = boton.querySelector('.btn-text');
    const textoLoading = boton.querySelector('.btn-loading');
    
    if (cargando) {
        boton.disabled = true;
        boton.classList.add('loading');
        if (textoNormal) textoNormal.style.display = 'none';
        if (textoLoading) textoLoading.style.display = 'inline-flex';
    } else {
        boton.disabled = false;
        boton.classList.remove('loading');
        if (textoNormal) textoNormal.style.display = 'inline-flex';
        if (textoLoading) textoLoading.style.display = 'none';
    }
}

// Función para mostrar confirmación personalizada
function mostrarConfirmacionPersonalizada(titulo, mensaje, textoConfirmar, textoCancelar) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal-overlay';
        modal.innerHTML = `
            <div class="confirmation-modal">
                <div class="confirmation-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>${titulo}</h4>
                </div>
                <div class="confirmation-body">
                    <p>${mensaje}</p>
                </div>
                <div class="confirmation-actions">
                    <button class="btn btn-danger btn-confirm">
                        <i class="fas fa-trash me-2"></i>${textoConfirmar}
                    </button>
                    <button class="btn btn-secondary btn-cancel">
                        <i class="fas fa-times me-2"></i>${textoCancelar}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.btn-confirm').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        modal.querySelector('.btn-cancel').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        // Animar entrada
        setTimeout(() => modal.classList.add('show'), 10);
    });
}

// ==================== FUNCIONES PARA COMPATIBILIDAD ====================

// Funciones que se exportan para usar en script.js (compatibilidad)
function renderizarProyectosCompatibilidad(proyectos, usuarios) {
    return renderizarProyectos(proyectos, usuarios);
}

function crearProyectoCompatibilidad(proyecto) {
    return crearProyecto(proyecto);
}

function eliminarProyectoCompatibilidad(proyectoId, elementoDOM) {
    return manejarEliminacionProyecto(proyectoId, elementoDOM);
}

// ==================== EXPORTACIÓN ====================

// Para uso en módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerProyectos,
        obtenerProyectoPorId,
        crearProyecto,
        actualizarProyecto,
        eliminarProyecto,
        renderizarProyectos,
        configurarFormularioCrearProyecto,
        configurarFormularioEditarProyecto,
        manejarEliminacionProyecto,
        irAlChatProyecto,
        formatearFecha,
        escapeHtml
    };
}

// ==================== INICIALIZACIÓN ====================

console.log('Módulo Projects cargado correctamente');