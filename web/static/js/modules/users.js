import { fetchWithCredentials, API_BASE_URL } from './api.js';
import { mostrarToast, mostrarAlerta, guardarAlertaParaSiguientePagina } from './alerts.js';
import { obtenerRolUsuario } from './auth.js';
import { renderizarProyectos } from './projects.js';

export async function cargarDatosUsuarios() {
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
        if (!usernameActual) {
            console.log("No se encontró username en sessionStorage");
            return;
        }
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

export async function cargarDatosAdmin() {
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
        if (!usernameActual) {
            console.log("No se encontró username en sessionStorage");
            return;
        }
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

export async function cargarFormularioCrearUsuario() {
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
            guardarAlertaParaSiguientePagina("Usuario creado con éxito", "success");
            window.location.href = "/perfil";
        }
        catch (error) {
            console.error("Error al crear el usuario:", error);
            mostrarToast("Hubo un error al crear el usuario", "danger");
        }
    });
};

export async function editarUsuario(usuarioId) {
    console.log("Editando usuario con ID:", usuarioId);
    const usuario = await obtenerUsuarioPorId(usuarioId);
    console.log("Usuario a editar:", usuario);
    if (usuario) {
        localStorage.setItem("usuarioEditar", usuario.id);
    }
    if (!usuario) {
        mostrarToast("No se pudo cargar el usuario. Redirigiendo al perfil.", "danger");
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

            guardarAlertaParaSiguientePagina("Usuario actualizado con éxito", "success");
            window.location.href = "/perfil";
        } catch (error) {
            mostrarToast("Hubo un error al actualizar el usuario", "danger");
            console.error(error);
        }
    });
}

function renderizarInformacionPersonal(usuario) {
    const profileInfo = document.getElementById("profile-info");
    const rolUsuario = document.getElementById("rol-usuario");
    
    if (!profileInfo) {
        console.log("Elemento 'profile-info' no encontrado en la página");
        return;
    }

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

export async function eliminarUsuario(userId) {
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
        obtenerUsuarios(); // Actualizar la lista de usuarios
    } catch (error) {
        console.error(error);
    }
}

export async function obtenerUsuarioPorId(usuarioId) {
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

export async function obtenerUsuarios() {
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

export async function crearUsuario(usuario) {
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