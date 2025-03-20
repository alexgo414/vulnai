document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('step-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.step-header, .step-text').forEach(el => {
        observer.observe(el);
    });
});

//Mostrar mensaje de bienvenida 
document.addEventListener("DOMContentLoaded", function () {
    // Seleccionar el contenedor de mensajes
    const chatMensajes = document.querySelector(".chat-mensajes");

    // Crear el elemento del mensaje de bienvenida
    const mensajeBienvenida = document.createElement("div");
    mensajeBienvenida.classList.add("campo-bot");

    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot icono-bot"></i>
        </div>
        <div class="mensaje-bot">
            <p class="my-2">¡Hola! Bienvenido, ¿en qué puedo ayudarte?</p>
        </div>
    `;

    // Insertar el mensaje al inicio del contenedor
    chatMensajes.prepend(mensajeBienvenida);
});