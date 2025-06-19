import { animateSteps } from './modules/animations.js';
import { inicializarChat } from './modules/chat.js';
import { logearUsuario, configurarLogout, obtenerRolUsuario, cerrarSesion } from './modules/auth.js';
import { cargarFormularioCrearProyecto, editarProyecto, eliminarProyecto } from './modules/projects.js';
import { editarUsuario, cargarFormularioCrearUsuario, cargarDatosAdmin, cargarDatosUsuarios, eliminarUsuario } from './modules/users.js';
import { mostrarAlertaGuardada } from './modules/alerts.js';
import { inicializarNavegacion } from './modules/navigation.js';

window.eliminarProyecto = eliminarProyecto;
window.eliminarUsuario = eliminarUsuario;
window.cerrarSesion = cerrarSesion;

document.addEventListener("DOMContentLoaded", async () => {
    await inicializarNavegacion();

    mostrarAlertaGuardada();

    configurarLogout();
    console.log("Configuración de logout completada.");

    console.log("DOM completamente cargado y analizado.");

    if (document.getElementById("chat-mensajes") || document.querySelector('.chat-container')) {
        console.log("🚀 Página de chat detectada, inicializando...");
        inicializarChat();
    }

    if (document.getElementById("login-form")) {
        console.log("Formulario de inicio de sesión encontrado.");
        logearUsuario();
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