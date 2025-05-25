// Gestión de Usuarios

// ==================== CONFIGURACIÓN Y CONSTANTES ====================
const API_BASE_URL = "http://localhost:5001";

// ==================== FUNCIONES PRINCIPALES ====================

// Función para obtener todos los usuarios
async function obtenerUsuarios() {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Error al obtener usuarios: ${response.statusText}`);
        }

        const usuarios = await response.json();
        console.log("Usuarios obtenidos:", usuarios);
        return usuarios;
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        throw error;
    }
}

// Función para obtener un usuario específico por ID
async function obtenerUsuarioPorId(usuarioId) {
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Usuario no encontrado');
            }
            throw new Error(`Error al obtener el usuario: ${response.statusText}`);
        }

        const usuario = await response.json();
        console.log("Usuario obtenido:", usuario);
        return usuario;
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        throw error;
    }
}

// Función para crear un nuevo usuario
async function crearUsuario(datosUsuario) {
    console.log("Creando usuario:", datosUsuario);
    
    try {
        // Validar datos antes de enviar
        const erroresValidacion = validarDatosUsuario(datosUsuario);
        if (erroresValidacion.length > 0) {
            throw new Error(erroresValidacion.join(', '));
        }

        const response = await fetch(`${API_BASE_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                username: datosUsuario.username.trim(),
                nombre: datosUsuario.nombre.trim(),
                apellidos: datosUsuario.apellidos.trim(),
                email: datosUsuario.email.trim(),
                password: datosUsuario.password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al crear usuario: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Usuario creado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw error;
    }
}

// Función para actualizar un usuario
async function actualizarUsuario(usuarioId, datosActualizados) {
    console.log("Actualizando usuario:", usuarioId, datosActualizados);
    
    try {
        // Validar datos antes de enviar
        const erroresValidacion = validarDatosUsuario(datosActualizados, true);
        if (erroresValidacion.length > 0) {
            throw new Error(erroresValidacion.join(', '));
        }

        const body = {
            username: datosActualizados.username.trim(),
            nombre: datosActualizados.nombre.trim(),
            apellidos: datosActualizados.apellidos.trim(),
            email: datosActualizados.email.trim()
        };

        // Solo incluir password si se proporciona
        if (datosActualizados.password && datosActualizados.password.trim()) {
            body.password = datosActualizados.password;
        }

        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al actualizar usuario: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Usuario actualizado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        throw error;
    }
}

// Función para eliminar un usuario
async function eliminarUsuario(usuarioId) {
    console.log("Eliminando usuario:", usuarioId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            method: "DELETE",
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error al eliminar usuario: ${response.statusText}`);
        }

        const resultado = await response.json();
        console.log("Usuario eliminado:", resultado);
        
        return resultado;
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        throw error;
    }
}

// Función para obtener información personal del usuario logueado
async function obtenerInformacionPersonal() {
    try {
        const response = await fetch(`${API_BASE_URL}/perfil`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Error al obtener información personal: ${response.statusText}`);
        }

        const usuario = await response.json();
        console.log("Información personal obtenida:", usuario);
        return usuario;
    } catch (error) {
        console.error('Error al obtener información personal:', error);
        throw error;
    }
}

// ==================== VALIDACIÓN DE DATOS ====================

function validarDatosUsuario(datos, esActualizacion = false) {
    const errores = [];
    
    // Validar username
    if (!datos.username || datos.username.trim() === '') {
        errores.push('El nombre de usuario es obligatorio');
    } else if (datos.username.trim().length < 3) {
        errores.push('El nombre de usuario debe tener al menos 3 caracteres');
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(datos.username.trim())) {
        errores.push('El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos');
    }
    
    // Validar nombre
    if (!datos.nombre || datos.nombre.trim() === '') {
        errores.push('El nombre es obligatorio');
    } else if (datos.nombre.trim().length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
    }
    
    // Validar apellidos
    if (!datos.apellidos || datos.apellidos.trim() === '') {
        errores.push('Los apellidos son obligatorios');
    } else if (datos.apellidos.trim().length < 2) {
        errores.push('Los apellidos deben tener al menos 2 caracteres');
    }
    
    // Validar email
    if (!datos.email || datos.email.trim() === '') {
        errores.push('El email es obligatorio');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(datos.email.trim())) {
            errores.push('El formato del email no es válido');
        }
    }
    
    // Validar password (solo si no es actualización o si se proporciona)
    if (!esActualizacion || (datos.password && datos.password.trim())) {
        if (!datos.password || datos.password.length < 6) {
            errores.push('La contraseña debe tener al menos 6 caracteres');
        }
    }
    
    return errores;
}

// ==================== RENDERIZACIÓN Y UI ====================

// Función para renderizar lista de usuarios
function renderizarUsuarios(usuarios) {
    const usuariosContainer = document.getElementById("usuarios-container");
    if (!usuariosContainer) return;
    
    // Limpiar contenedor
    usuariosContainer.innerHTML = "";
    
    // Agregar encabezado
    const header = document.createElement('div');
    header.className = 'col-12 mb-4';
    header.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-users me-2"></i>Gestión de Usuarios</h3>
            <a href="/perfil/usuario_nuevo" class="btn btn-success">
                <i class="fas fa-user-plus me-2"></i>Nuevo Usuario
            </a>
        </div>
    `;
    usuariosContainer.appendChild(header);
    
    // Verificar si hay usuarios
    if (!usuarios || usuarios.length === 0) {
        renderizarEstadoVacioUsuarios(usuariosContainer);
        return;
    }

    // Renderizar cada usuario
    usuarios.forEach((usuario, index) => {
        const usuarioElement = crearElementoUsuario(usuario, index);
        usuariosContainer.appendChild(usuarioElement);
    });
    
    // Configurar event listeners
    configurarEventListenersUsuarios();
}

// Función para crear elemento DOM de un usuario
function crearElementoUsuario(usuario, index) {
    const usuarioDiv = document.createElement("div");
    usuarioDiv.classList.add("col-lg-6", "col-xl-4", "mb-4");
    usuarioDiv.style.animationDelay = `${index * 0.1}s`;
    usuarioDiv.setAttribute('data-usuario-id', usuario.id);
    
    usuarioDiv.innerHTML = `
        <div class="card h-100 user-card">
            <div class="card-header user-header">
                <div class="user-icon">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-status ${usuario.activo ? 'active' : 'inactive'}">
                    <i class="fas fa-circle"></i>
                    <span>${usuario.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
            </div>
            
            <div class="card-body">
                <h5 class="card-title user-title">
                    <i class="fas fa-at me-2"></i>${escapeHtml(usuario.username)}
                </h5>
                
                <div class="user-info">
                    <div class="info-item">
                        <i class="fas fa-user me-2"></i>
                        <span><strong>Nombre:</strong> ${escapeHtml(usuario.nombre)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users me-2"></i>
                        <span><strong>Apellidos:</strong> ${escapeHtml(usuario.apellidos)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-envelope me-2"></i>
                        <span><strong>Email:</strong> ${escapeHtml(usuario.email)}</span>
                    </div>
                </div>
                
                <div class="user-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar-plus me-2"></i>
                        <span><strong>Creado:</strong></span>
                        <div class="fecha-info">${formatearFecha(usuario.fecha_creacion)}</div>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-edit me-2"></i>
                        <span><strong>Modificado:</strong></span>
                        <div class="fecha-info">${formatearFecha(usuario.fecha_modificacion)}</div>
                    </div>
                </div>
            </div>
            
            <div class="card-footer user-footer">
                <div class="user-actions">
                    <button class="btn btn-primary btn-editar-usuario" 
                            data-usuario-id="${usuario.id}">
                        <i class="fas fa-edit me-2"></i>Editar
                    </button>
                    <button class="btn btn-danger btn-eliminar-usuario" 
                            data-usuario-id="${usuario.id}">
                        <i class="fas fa-trash me-2"></i>Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return usuarioDiv;
}

// Función para renderizar estado vacío
function renderizarEstadoVacioUsuarios(container) {
    const emptyState = document.createElement('div');
    emptyState.className = 'col-12';
    emptyState.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class="fas fa-users"></i>
            </div>
            <h3 class="empty-state-title">No hay usuarios</h3>
            <p class="empty-state-description">
                Crea el primer usuario para comenzar a gestionar el acceso a la plataforma.
            </p>
            <div class="empty-state-actions">
                <a href="/perfil/usuario_nuevo" class="btn btn-primary btn-lg">
                    <i class="fas fa-user-plus me-2"></i>Crear Primer Usuario
                </a>
            </div>
        </div>
    `;
    container.appendChild(emptyState);
}

// Función para renderizar información personal
function renderizarInformacionPersonal(usuario) {
    const informacionPersonalContainer = document.getElementById("informacion-personal-container");
    if (!informacionPersonalContainer) return;
    
    // Limpiar contenedor
    informacionPersonalContainer.innerHTML = "";
    
    // Agregar encabezado
    const header = document.createElement('div');
    header.className = 'col-12 mb-4';
    header.innerHTML = `
        <div class="panel-header">
            <h3><i class="fas fa-user-circle me-2"></i>Mi Perfil</h3>
            <a href="/perfil/usuario_editar/${usuario.id}" class="btn btn-primary">
                <i class="fas fa-edit me-2"></i>Editar Perfil
            </a>
        </div>
    `;
    informacionPersonalContainer.appendChild(header);
    
    // Crear tarjeta de información personal
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("col-12");
    infoDiv.innerHTML = `
        <div class="card personal-info-card">
            <div class="card-header personal-info-header">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <h5 class="mb-0">Información Personal</h5>
            </div>
            
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="info-group">
                            <label class="info-label">
                                <i class="fas fa-at me-2"></i>Nombre de Usuario
                            </label>
                            <div class="info-value">${escapeHtml(usuario.username)}</div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="info-group">
                            <label class="info-label">
                                <i class="fas fa-envelope me-2"></i>Email
                            </label>
                            <div class="info-value">${escapeHtml(usuario.email)}</div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="info-group">
                            <label class="info-label">
                                <i class="fas fa-user me-2"></i>Nombre
                            </label>
                            <div class="info-value">${escapeHtml(usuario.nombre)}</div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="info-group">
                            <label class="info-label">
                                <i class="fas fa-users me-2"></i>Apellidos
                            </label>
                            <div class="info-value">${escapeHtml(usuario.apellidos)}</div>
                        </div>
                    </div>
                    
                    <div class="col-12">
                        <div class="info-group">
                            <label class="info-label">
                                <i class="fas fa-calendar-plus me-2"></i>Miembro desde
                            </label>
                            <div class="info-value">${formatearFecha(usuario.fecha_creacion)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="account-stats">
                    <div class="stat-item">
                        <i class="fas fa-project-diagram"></i>
                        <span class="stat-number">--</span>
                        <span class="stat-label">Proyectos</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-comments"></i>
                        <span class="stat-number">--</span>
                        <span class="stat-label">Conversaciones</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span class="stat-number">--</span>
                        <span class="stat-label">Horas de uso</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    informacionPersonalContainer.appendChild(infoDiv);
}

// ==================== FORMULARIOS ====================

// Función para configurar formulario de crear usuario
function configurarFormularioCrearUsuario() {
    const form = document.getElementById("crear-usuario-form");
    if (!form) return;

    // Configurar validación en tiempo real
    configurarValidacionFormulario(form);

    // Manejar envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Obtener datos del formulario
        const datosUsuario = {
            username: document.getElementById("username").value,
            nombre: document.getElementById("nombre").value,
            apellidos: document.getElementById("apellidos").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        // Validar formulario
        const errores = validarDatosUsuario(datosUsuario);
        if (errores.length > 0) {
            mostrarError(errores.join('<br>'));
            return;
        }

        // Mostrar estado de carga
        mostrarCargandoFormulario(submitBtn, true);

        try {
            await crearUsuario(datosUsuario);
            
            sessionStorage.setItem("alertMessage", "¡Usuario creado con éxito!");
            sessionStorage.setItem("alertType", "success");
            window.location.href = "/perfil";

        } catch (error) {
            console.error("Error al crear usuario:", error);
            mostrarError(error.message || "Error al crear el usuario");
        } finally {
            mostrarCargandoFormulario(submitBtn, false);
        }
    });
}

// Función para configurar formulario de editar usuario
function configurarFormularioEditarUsuario(usuarioId) {
    console.log("Configurando formulario de edición para usuario:", usuarioId);
    
    // Cargar datos del usuario y mostrar formulario
    cargarYMostrarFormularioEdicionUsuario(usuarioId);
}

// Función para cargar y mostrar formulario de edición de usuario
async function cargarYMostrarFormularioEdicionUsuario(usuarioId) {
    const container = document.getElementById("usuario-editar-container");
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
                <p>Cargando datos del usuario...</p>
            </div>
        `;

        // Obtener datos del usuario
        const usuario = await obtenerUsuarioPorId(usuarioId);
        
        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        // Mostrar formulario de edición
        mostrarFormularioEdicionUsuario(container, usuario);

    } catch (error) {
        console.error("Error al cargar usuario para edición:", error);
        
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                </div>
                <h3>Error al cargar el usuario</h3>
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

// Función para mostrar formulario de edición de usuario
function mostrarFormularioEdicionUsuario(container, usuario) {
    container.innerHTML = `
        <div class="form-card">
            <div class="form-card-header">
                <div class="form-icon">
                    <i class="fas fa-user"></i>
                </div>
                <h3 class="form-title">Editar Usuario</h3>
                <p class="form-subtitle">Actualiza la información de: <strong>${escapeHtml(usuario.username)}</strong></p>
            </div>
            
            <div class="form-card-body">
                <form id="editar-usuario-form" novalidate>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="username" class="form-label required">
                                    <i class="fas fa-at me-2"></i>Nombre de Usuario
                                </label>
                                <input type="text" 
                                       id="username" 
                                       name="username" 
                                       class="form-control" 
                                       required 
                                       value="${escapeHtml(usuario.username)}"
                                       placeholder="Ingresa el nombre de usuario">
                                <div class="invalid-feedback">
                                    El nombre de usuario es obligatorio y debe tener al menos 3 caracteres.
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="email" class="form-label required">
                                    <i class="fas fa-envelope me-2"></i>Email
                                </label>
                                <input type="email" 
                                       id="email" 
                                       name="email" 
                                       class="form-control" 
                                       required 
                                       value="${escapeHtml(usuario.email)}"
                                       placeholder="Ingresa el email">
                                <div class="invalid-feedback">
                                    Ingresa un email válido.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="nombre" class="form-label required">
                                    <i class="fas fa-user me-2"></i>Nombre
                                </label>
                                <input type="text" 
                                       id="nombre" 
                                       name="nombre" 
                                       class="form-control" 
                                       required 
                                       value="${escapeHtml(usuario.nombre)}"
                                       placeholder="Ingresa el nombre">
                                <div class="invalid-feedback">
                                    El nombre es obligatorio.
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="form-group">
                                <label for="apellidos" class="form-label required">
                                    <i class="fas fa-users me-2"></i>Apellidos
                                </label>
                                <input type="text" 
                                       id="apellidos" 
                                       name="apellidos" 
                                       class="form-control" 
                                       required 
                                       value="${escapeHtml(usuario.apellidos)}"
                                       placeholder="Ingresa los apellidos">
                                <div class="invalid-feedback">
                                    Los apellidos son obligatorios.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">
                            <i class="fas fa-lock me-2"></i>Nueva Contraseña
                        </label>
                        <div class="password-input-container">
                            <input type="password" 
                                   id="password" 
                                   name="password" 
                                   class="form-control" 
                                   placeholder="Dejar vacío para mantener la actual">
                            <button type="button" class="password-toggle" data-target="password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div class="form-help">
                            Opcional: Solo completa si deseas cambiar la contraseña actual.
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
    const form = document.getElementById("editar-usuario-form");
    configurarValidacionFormulario(form);
    configurarTogglePassword();

    // Manejar envío
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Obtener datos del formulario
        const datosActualizados = {
            username: document.getElementById("username").value,
            nombre: document.getElementById("nombre").value,
            apellidos: document.getElementById("apellidos").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        // Validar formulario
        const errores = validarDatosUsuario(datosActualizados, true);
        if (errores.length > 0) {
            mostrarError(errores.join('<br>'));
            return;
        }

        // Mostrar estado de carga
        mostrarCargandoFormulario(submitBtn, true);

        try {
            await actualizarUsuario(usuario.id, datosActualizados);

            sessionStorage.setItem("alertMessage", "¡Usuario actualizado con éxito!");
            sessionStorage.setItem("alertType", "success");
            window.location.href = "/perfil";

        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            mostrarError(error.message || "Error al actualizar el usuario");
        } finally {
            mostrarCargandoFormulario(submitBtn, false);
        }
    });
}

// ==================== EVENT LISTENERS ====================

// Función para configurar event listeners de usuarios
function configurarEventListenersUsuarios() {
    // Botones de editar
    document.querySelectorAll('.btn-editar-usuario').forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            window.location.href = `/perfil/usuario_editar/${usuarioId}`;
        });
    });

    // Botones de eliminar
    document.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.addEventListener('click', function() {
            const usuarioId = this.getAttribute('data-usuario-id');
            const usuarioCard = this.closest('[data-usuario-id]');
            manejarEliminacionUsuario(usuarioId, usuarioCard);
        });
    });
}

// Función para manejar eliminación de usuario
async function manejarEliminacionUsuario(usuarioId, elementoDOM) {
    // Mostrar confirmación
    const confirmacion = await confirmarAccion(
        "¿Eliminar usuario?",
        "Esta acción no se puede deshacer. Se eliminará el usuario y todos sus datos asociados.",
        {
            confirmarTexto: "Eliminar",
            cancelarTexto: "Cancelar",
            confirmarClase: "btn-danger",
            tipo: "danger"
        }
    );

    if (!confirmacion) return;

    try {
        await eliminarUsuario(usuarioId);
        
        mostrarExito("Usuario eliminado con éxito");
        
        // Remover elemento del DOM con animación
        if (elementoDOM) {
            elementoDOM.style.transform = 'scale(0)';
            elementoDOM.style.opacity = '0';
            setTimeout(() => {
                elementoDOM.remove();
                
                // Verificar si quedan usuarios
                const contenedor = document.getElementById('usuarios-container');
                const usuariosRestantes = contenedor.querySelectorAll('[data-usuario-id]');
                if (usuariosRestantes.length === 0) {
                    renderizarEstadoVacioUsuarios(contenedor);
                }
            }, 300);
        }

    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        mostrarError(error.message || "Error al eliminar el usuario");
    }
}

// ==================== UTILIDADES ====================

// Función para formatear fechas (ya está en ui.js, pero por compatibilidad)
function formatearFecha(fechaString) {
    if (typeof window.formatearFecha === 'function') {
        return window.formatearFecha(fechaString);
    }
    
    // Fallback básico
    if (!fechaString) return 'N/A';
    
    try {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// Función para escapar HTML (ya está en ui.js, pero por compatibilidad)
function escapeHtml(text) {
    if (typeof window.escapeHtml === 'function') {
        return window.escapeHtml(text);
    }
    
    // Fallback básico
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

// ==================== FUNCIONES DE COMPATIBILIDAD ====================

// Funciones que se exportan para usar en script.js (compatibilidad)
function renderizarUsuariosCompatibilidad(usuarios) {
    return renderizarUsuarios(usuarios);
}

function renderizarInformacionPersonalCompatibilidad(usuario) {
    return renderizarInformacionPersonal(usuario);
}

function eliminarUsuarioCompatibilidad(usuarioId) {
    return manejarEliminacionUsuario(usuarioId);
}

// ==================== EXPORTACIÓN ====================

// Para uso en módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerUsuarios,
        obtenerUsuarioPorId,
        obtenerInformacionPersonal,
        crearUsuario,
        actualizarUsuario,
        eliminarUsuario,
        renderizarUsuarios,
        renderizarInformacionPersonal,
        configurarFormularioCrearUsuario,
        configurarFormularioEditarUsuario,
        manejarEliminacionUsuario,
        validarDatosUsuario,
        formatearFecha,
        escapeHtml
    };
}

// ==================== INICIALIZACIÓN ====================

console.log('Módulo Users cargado correctamente');