import { fetchWithCredentials, API_BASE_URL } from './api.js';
import { mostrarToast, mostrarAlerta, guardarAlertaParaSiguientePagina } from './alerts.js';

async function verificarAutenticacion() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

export function actualizarNavegacion(estaLogueado) {
    const elementosUsuario = document.querySelectorAll('.user-only');
    const elementosInvitado = document.querySelectorAll('.guest-only');
    
    if (estaLogueado) {
        // Mostrar elementos para usuarios logueados
        elementosUsuario.forEach(elemento => {
            elemento.style.display = 'block';
        });
        // Ocultar elementos para invitados
        elementosInvitado.forEach(elemento => {
            elemento.style.display = 'none';
        });
    } else {
        // Ocultar elementos para usuarios logueados
        elementosUsuario.forEach(elemento => {
            elemento.style.display = 'none';
        });
        // Mostrar elementos para invitados
        elementosInvitado.forEach(elemento => {
            elemento.style.display = 'block';
        });
    }
}

export async function verificarYActualizarNavegacion() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        const estaLogueado = response.ok;
        
        console.log("Estado de autenticación:", estaLogueado ? "Logueado" : "No logueado");
        actualizarNavegacion(estaLogueado);
        
        return estaLogueado;
    } catch (error) {
        console.log("Error verificando autenticación:", error);
        actualizarNavegacion(false);
        return false;
    }
}

export async function navegarConAutenticacion(url) {
    const estaLogueado = await verificarYActualizarNavegacion();
    
    if (estaLogueado) {
        window.location.href = url;
    } else {
        mostrarAlerta("Debes iniciar sesión para acceder a esta sección.", "warning");
        setTimeout(() => {
            window.location.href = "/login";
        }, 2000);
    }
}

export async function logearUsuario() {
    console.log("Iniciando sesión...");
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetchWithCredentials(`${API_BASE_URL}/login`, {
                method: "POST",
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                mostrarToast("Usuario o contraseña incorrectos", "danger");
                return;
            }
            
            const data = await response.json();
            sessionStorage.setItem("username", username);
            
            actualizarNavegacion(true);

            guardarAlertaParaSiguientePagina(`¡Bienvenido, ${username}!`, "success", 4000);
            
            window.location.href = "/perfil";
            
        } catch (error) {
            console.error(error);
            mostrarToast("Error al iniciar sesión. Verifica tus credenciales.", "danger");
        }
    });
}

export async function cerrarSesion() {
    try {
        await fetchWithCredentials(`${API_BASE_URL}/logout`, {
            method: "POST"
        });
        
        sessionStorage.clear();

        guardarAlertaParaSiguientePagina("Sesión cerrada correctamente", "success", 3000);
        
        actualizarNavegacion(false);
        
        window.location.href = "/login";
        
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        sessionStorage.clear();
        actualizarNavegacion(false);
        
        mostrarToast("Sesión cerrada", "info", 3000);
        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);
    }
}

export async function obtenerRolUsuario() {
    try {
        const response = await fetchWithCredentials(`${API_BASE_URL}/usuarios/rol`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener el rol del usuario: ${response.statusText}`);
        }
        const rol = await response.json();
        console.log("Rol del usuario obtenido:", rol);
        return rol.rol[0];
    } catch (error) {
        console.error("Error al obtener el rol del usuario:", error);
        return null;
    }
}

export function configurarLogout() {
    const logoutLink = document.getElementById("logout-link");
    if (logoutLink) {
        logoutLink.addEventListener("click", function() {
            cerrarSesion();
        });
    }
}