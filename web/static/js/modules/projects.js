import { fetchWithCredentials, API_BASE_URL } from './api.js';
import { mostrarToast, mostrarAlerta, guardarAlertaParaSiguientePagina } from './alerts.js';

export async function cargarFormularioCrearProyecto() {
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

            guardarAlertaParaSiguientePagina("Proyecto creado con éxito", "success");
            window.location.href = "/perfil";
        } catch (error) {
            console.error("Error al crear el proyecto:", error);
            mostrarToast("Hubo un error al crear el proyecto", "danger");
        }
    });
}

export async function editarProyecto(proyectoId) {
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

            guardarAlertaParaSiguientePagina("Proyecto actualizado con éxito", "success");
            window.location.href = "/perfil";
        } catch (error) {
            mostrarToast("Hubo un error al actualizar el proyecto", "danger");
            console.error(error);
        }
    });
}

export async function eliminarProyecto(proyectoId, elementoDOM) {
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

        guardarAlertaParaSiguientePagina("Proyecto eliminado con éxito", "success");
        // Recargar la pagina
        window.location.reload();

        if (elementoDOM) {
            elementoDOM.remove(); // Elimina el proyecto del DOM
        }
    } catch (error) {
        console.error(error);
        mostrarToast("Hubo un error al eliminar el proyecto.", "danger");
    }
}

export async function obtenerProyectos() {
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

export function renderizarProyectos(proyectos, usuarios) {
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

export async function obtenerProyectoPorId(proyectoId) {
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