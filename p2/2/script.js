//Agrega animcaciones en la seccion de guía de SVAIA
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

// Exercise 2: Chat functionality
document.addEventListener("DOMContentLoaded", function () {
    const chatMensajes = document.querySelector(".chat-mensajes");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");

    sendButton.addEventListener("click", function () {
        const messageText = messageInput.value.trim();

        if (messageText !== "") {
            // Add user's message
            const userMessage = document.createElement("div");
            userMessage.classList.add("campo-usuario");
            userMessage.innerHTML = `
                <div class="mensaje-usuario">
                    <p class="my-2">${messageText}</p>
                </div>
                <div class="icono-usuario">
                    <i class="fas fa-user icono-user"></i>
                </div>
            `;
            chatMensajes.appendChild(userMessage);

            // Add bot's response (repeating the user's message)
            const botMessage = document.createElement("div");
            botMessage.classList.add("campo-bot");
            botMessage.innerHTML = `
                <div class="icono-bot">
                    <i class="fas fa-robot icono-bot"></i>
                </div>
                <div class="mensaje-bot">
                    <p class="my-2">${messageText}</p>
                </div>
            `;
            chatMensajes.appendChild(botMessage);

            // Clear input
            messageInput.value = "";

            // Scroll to bottom
            chatMensajes.scrollTop = chatMensajes.scrollHeight;
        }
    });

    // Optional: Send message with Enter key
    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendButton.click();
        }
    });
});