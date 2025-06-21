import { fetchWithCredentials, API_BASE_URL } from './api.js';
import { mostrarToast, mostrarAlerta, guardarAlertaParaSiguientePagina } from './alerts.js';

export async function cargarFormularioCrearProyecto() {
    const form = document.getElementById("crear-proyecto-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = document.getElementById("nombre").value;
        const descripcion = document.getElementById("descripcion").value;
        const maxVulnerabilidades = parseInt(document.getElementById("max_vulnerabilidades").value) || 10;
        const maxSeveridad = document.getElementById("max_severidad").value || 'MEDIUM';
        
        // ✅ EXTRAER CAMPOS DE SOLUCIONABILIDAD
        const pesoSeveridad = parseInt(document.getElementById("peso_severidad").value) || 70;
        const pesoSolucionabilidad = parseInt(document.getElementById("peso_solucionabilidad").value) || 30;
        const umbralFacil = parseInt(document.getElementById("umbral_facil").value) || 75;
        const umbralMedia = parseInt(document.getElementById("umbral_media").value) || 50;
        
        const prioriVectoresRed = document.getElementById("priori_vectores_red").checked;
        const prioriSinParches = document.getElementById("priori_sin_parches").checked;
        const prioriExploitPublico = document.getElementById("priori_exploit_publico").checked;
        const incluirTemporalFixes = document.getElementById("incluir_temporal_fixes").checked;
        const excluirPrivilegiosAltos = document.getElementById("excluir_privilegios_altos").checked;

        try {
            const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos`, {
                method: "POST",
                body: JSON.stringify({ 
                    nombre, 
                    descripcion, 
                    max_vulnerabilidades: maxVulnerabilidades,
                    max_severidad: maxSeveridad,
                    // ✅ INCLUIR CAMPOS DE SOLUCIONABILIDAD
                    peso_severidad: pesoSeveridad,
                    peso_solucionabilidad: pesoSolucionabilidad,
                    umbral_solucionabilidad_facil: umbralFacil,
                    umbral_solucionabilidad_media: umbralMedia,
                    priori_vectores_red: prioriVectoresRed,
                    priori_sin_parches: prioriSinParches,
                    priori_exploit_publico: prioriExploitPublico,
                    incluir_temporal_fixes: incluirTemporalFixes,
                    excluir_privilegios_altos: excluirPrivilegiosAltos
                })
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

    // ✅ GENERAR EL FORMULARIO UNIFICADO CON CAMPOS DE SOLUCIONABILIDAD
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
                <textarea id="descripcion" name="descripcion" class="form-control" rows="4" placeholder="Describe brevemente el proyecto">${proyecto.descripcion || ''}</textarea>
            </div>
            
            <!-- ✅ SECCIÓN DE CONFIGURACIÓN DE SEGURIDAD -->
            <div class="mb-4">
                <h6 class="border-bottom pb-2 mb-3">
                    <i class="fas fa-shield-alt me-2 text-warning"></i>
                    Configuración de Seguridad
                </h6>
                
                <div class="mb-3">
                    <label for="max_vulnerabilidades" class="form-label">
                        <strong>Máximo de vulnerabilidades aceptadas en SBOM:</strong>
                    </label>
                    <div class="input-group">
                        <input type="number" id="max_vulnerabilidades" name="max_vulnerabilidades" 
                                class="form-control" value="${proyecto.max_vulnerabilidades || 10}" min="0" max="1000" required>
                        <span class="input-group-text">
                            <i class="fas fa-bug"></i>
                        </span>
                    </div>
                </div>

                <div class="mb-3">
                    <label for="max_severidad" class="form-label">
                        <strong>Severidad máxima aceptada:</strong>
                    </label>
                    <div class="input-group">
                        <select id="max_severidad" name="max_severidad" class="form-control" required>
                            <option value="LOW" ${proyecto.max_severidad === 'LOW' ? 'selected' : ''}>🟢 LOW - Baja</option>
                            <option value="MEDIUM" ${proyecto.max_severidad === 'MEDIUM' ? 'selected' : ''}>🟡 MEDIUM - Media</option>
                            <option value="HIGH" ${proyecto.max_severidad === 'HIGH' ? 'selected' : ''}>🟠 HIGH - Alta</option>
                            <option value="CRITICAL" ${proyecto.max_severidad === 'CRITICAL' ? 'selected' : ''}>🔴 CRITICAL - Crítica</option>
                        </select>
                        <span class="input-group-text">
                            <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>
                </div>

                <!-- ✅ PREVIEW DEL NIVEL DE SEGURIDAD -->
                <div class="security-level-preview">
                    <label class="form-label">
                        <strong>Configuración de seguridad:</strong>
                    </label>
                    <div id="security-level-indicator" class="security-level high">
                        <span class="security-badge">
                            <i class="fas fa-shield-alt me-1"></i>
                            <span id="security-level-text">Alta Seguridad</span>
                        </span>
                    </div>
                    <div class="severity-level-preview mt-2">
                        <small class="text-muted">
                            <strong>Máximo:</strong> <span id="severity-display">🟡 MEDIUM</span> •
                            <strong>Cantidad:</strong> <span id="quantity-display">10</span> vulnerabilidades
                        </small>
                    </div>
                </div>
            </div>

            <!-- ✅ NUEVA SECCIÓN: CRITERIOS DE SOLUCIONABILIDAD -->
            <div class="mb-4">
                <h6 class="border-bottom pb-2 mb-3">
                    <i class="fas fa-tools me-2 text-info"></i>
                    Criterios de Solucionabilidad
                </h6>
                
                <!-- Pesos para priorización -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="peso_severidad" class="form-label">
                            <strong>Peso de Severidad (%):</strong>
                        </label>
                        <div class="input-group">
                            <input type="range" id="peso_severidad" name="peso_severidad" 
                                   class="form-range" min="0" max="100" value="${proyecto.peso_severidad || 70}" 
                                   oninput="updatePesoDisplay()">
                            <span class="input-group-text" style="min-width: 60px;">
                                <span id="peso-severidad-display">${proyecto.peso_severidad || 70}</span>%
                            </span>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <label for="peso_solucionabilidad" class="form-label">
                            <strong>Peso de Solucionabilidad (%):</strong>
                        </label>
                        <div class="input-group">
                            <input type="range" id="peso_solucionabilidad" name="peso_solucionabilidad" 
                                   class="form-range" min="0" max="100" value="${proyecto.peso_solucionabilidad || 30}" 
                                   oninput="updatePesoDisplay()">
                            <span class="input-group-text" style="min-width: 60px;">
                                <span id="peso-solucionabilidad-display">${proyecto.peso_solucionabilidad || 30}</span>%
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Umbrales -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="umbral_facil" class="form-label">
                            <strong>Umbral "Fácil de resolver" (puntos):</strong>
                        </label>
                        <input type="number" id="umbral_facil" name="umbral_solucionabilidad_facil" 
                               class="form-control" value="${proyecto.umbral_solucionabilidad_facil || 75}" min="50" max="100">
                    </div>
                    
                    <div class="col-md-6">
                        <label for="umbral_media" class="form-label">
                            <strong>Umbral "Dificultad media" (puntos):</strong>
                        </label>
                        <input type="number" id="umbral_media" name="umbral_solucionabilidad_media" 
                               class="form-control" value="${proyecto.umbral_solucionabilidad_media || 50}" min="25" max="75">
                    </div>
                </div>
                
                <!-- Criterios de priorización -->
                <div class="mb-3">
                    <label class="form-label"><strong>Criterios de alta prioridad:</strong></label>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="priori_vectores_red" 
                               name="priori_vectores_red" ${proyecto.priori_vectores_red !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="priori_vectores_red">
                            <i class="fas fa-network-wired text-danger me-1"></i>
                            Priorizar vulnerabilidades de vector de red
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="priori_sin_parches" 
                               name="priori_sin_parches" ${proyecto.priori_sin_parches !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="priori_sin_parches">
                            <i class="fas fa-exclamation-triangle text-warning me-1"></i>
                            Priorizar vulnerabilidades sin parches oficiales
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="priori_exploit_publico" 
                               name="priori_exploit_publico" ${proyecto.priori_exploit_publico !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="priori_exploit_publico">
                            <i class="fas fa-bug text-danger me-1"></i>
                            Priorizar vulnerabilidades con exploits públicos
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="incluir_temporal_fixes" 
                               name="incluir_temporal_fixes" ${proyecto.incluir_temporal_fixes !== false ? 'checked' : ''}>
                        <label class="form-check-label" for="incluir_temporal_fixes">
                            <i class="fas fa-band-aid text-info me-1"></i>
                            Incluir vulnerabilidades con soluciones temporales
                        </label>
                    </div>
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="excluir_privilegios_altos" 
                               name="excluir_privilegios_altos" ${proyecto.excluir_privilegios_altos === true ? 'checked' : ''}>
                        <label class="form-check-label" for="excluir_privilegios_altos">
                            <i class="fas fa-shield-alt text-success me-1"></i>
                            Excluir vulnerabilidades que requieren privilegios administrativos
                        </label>
                    </div>
                </div>

                <!-- Preview de la configuración -->
                <div class="alert alert-light border mb-3">
                    <h6 class="alert-heading">
                        <i class="fas fa-eye me-2"></i>Vista previa de la configuración:
                    </h6>
                    <div id="config-preview">
                        <div class="row">
                            <div class="col-md-6">
                                <small class="text-muted">
                                    <strong>Fórmula de priorización:</strong><br>
                                    Prioridad = (<span id="preview-peso-sev">${proyecto.peso_severidad || 70}</span>% × Severidad) + (<span id="preview-peso-sol">${proyecto.peso_solucionabilidad || 30}</span>% × Solucionabilidad)
                                </small>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted">
                                    <strong>Clasificación de solucionabilidad:</strong><br>
                                    • ≥<span id="preview-umbral-facil">${proyecto.umbral_solucionabilidad_facil || 75}</span> pts: 🟢 Fácil<br>
                                    • <span id="preview-umbral-medio">${proyecto.umbral_solucionabilidad_media || 50}</span>-<span id="preview-umbral-facil-2">${(proyecto.umbral_solucionabilidad_facil || 75) - 1}</span> pts: 🟡 Media<br>
                                    • <<span id="preview-umbral-medio-2">${proyecto.umbral_solucionabilidad_media || 50}</span> pts: 🔴 Difícil
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
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
        const maxVulnerabilidades = document.getElementById("max_vulnerabilidades").value;
        const maxSeveridad = document.getElementById("max_severidad").value;
        
        // ✅ EXTRAER CAMPOS DE SOLUCIONABILIDAD
        const pesoSeveridad = parseInt(document.getElementById("peso_severidad").value) || 70;
        const pesoSolucionabilidad = parseInt(document.getElementById("peso_solucionabilidad").value) || 30;
        const umbralFacil = parseInt(document.getElementById("umbral_facil").value) || 75;
        const umbralMedia = parseInt(document.getElementById("umbral_media").value) || 50;
        
        const prioriVectoresRed = document.getElementById("priori_vectores_red").checked;
        const prioriSinParches = document.getElementById("priori_sin_parches").checked;
        const prioriExploitPublico = document.getElementById("priori_exploit_publico").checked;
        const incluirTemporalFixes = document.getElementById("incluir_temporal_fixes").checked;
        const excluirPrivilegiosAltos = document.getElementById("excluir_privilegios_altos").checked;

        try {
            const body = { 
                nombre, 
                descripcion,
                max_vulnerabilidades: maxVulnerabilidades ? parseInt(maxVulnerabilidades) : proyecto.max_vulnerabilidades,
                max_severidad: maxSeveridad || proyecto.max_severidad,
                // ✅ INCLUIR CAMPOS DE SOLUCIONABILIDAD
                peso_severidad: pesoSeveridad,
                peso_solucionabilidad: pesoSolucionabilidad,
                umbral_solucionabilidad_facil: umbralFacil,
                umbral_solucionabilidad_media: umbralMedia,
                priori_vectores_red: prioriVectoresRed,
                priori_sin_parches: prioriSinParches,
                priori_exploit_publico: prioriExploitPublico,
                incluir_temporal_fixes: incluirTemporalFixes,
                excluir_privilegios_altos: excluirPrivilegiosAltos
            };

            const response = await fetchWithCredentials(`${API_BASE_URL}/proyectos/${proyecto.id}`, {
                method: "PUT",
                body: JSON.stringify(body)
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

function getSeverityDisplay(severity) {
    const severityMap = {
        'LOW': '🟢 LOW',
        'MEDIUM': '🟡 MEDIUM', 
        'HIGH': '🟠 HIGH',
        'CRITICAL': '🔴 CRITICAL'
    };
    return severityMap[severity] || '🟡 MEDIUM';
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
        
        // ✅ AÑADIR INDICADOR DE NIVEL DE SEGURIDAD
        const maxVuln = proyecto.max_vulnerabilidades || 10;
        let nivelSeguridad = '';
        let iconoSeguridad = '';
        let colorSeguridad = '';
        
        if (maxVuln <= 5) {
            nivelSeguridad = 'Alta Seguridad';
            iconoSeguridad = 'fas fa-shield-alt';
            colorSeguridad = 'text-success';
        } else if (maxVuln <= 15) {
            nivelSeguridad = 'Seguridad Estándar';
            iconoSeguridad = 'fas fa-shield-halved';
            colorSeguridad = 'text-warning';
        } else {
            nivelSeguridad = 'Seguridad Básica';
            iconoSeguridad = 'fas fa-exclamation-triangle';
            colorSeguridad = 'text-danger';
        }
        
        const proyectoCard = document.createElement("div");
        proyectoCard.classList.add("col-md-6", "col-xl-4", "mb-3");
        proyectoCard.innerHTML = `
            <div class="project-card">
                <h3 class="project-title">${proyecto.nombre}</h3>
                <p class="project-description">${proyecto.descripcion || 'Sin descripción disponible'}</p>
                
                <!-- ✅ INFORMACIÓN DE SEGURIDAD -->
                <div class="project-security mb-3">
                    <div class="security-info ${colorSeguridad}">
                        <i class="${iconoSeguridad} me-1"></i>
                        <strong>${nivelSeguridad}</strong>
                    </div>
                    <div class="security-limit">
                        <small class="text-muted">
                            <i class="fas fa-bug me-1"></i>
                            Máximo: ${maxVuln} vulnerabilidades
                        </small>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            Severidad máxima: ${getSeverityDisplay(proyecto.max_severidad || 'MEDIUM')}
                        </small>
                    </div>
                </div>
                
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