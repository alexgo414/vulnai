import { verificarYActualizarNavegacion, navegarConAutenticacion } from './auth.js';

export function configurarNavegacion() {
    const perfilLink = document.getElementById("perfil-link");
    const chatLink = document.getElementById("chat-link");
    
    if (perfilLink) {
        perfilLink.addEventListener("click", function (e) {
            e.preventDefault();
            navegarConAutenticacion("/perfil");
        });
    }

    if (chatLink) {
        chatLink.addEventListener("click", function (e) {
            e.preventDefault();
            navegarConAutenticacion("/chat");
        });
    }
}

export async function inicializarNavegacion() {
    // Verificar autenticación y actualizar navegación
    await verificarYActualizarNavegacion();
    
    // Configurar event listeners
    configurarNavegacion();
}