document.addEventListener('DOMContentLoaded', () => {
    // Animaciones en la sección de guía de SVAIA
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

    // Seleccionar elementos del chat
    const chatMensajes = document.querySelector('.chat-mensajes');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // Mostrar mensaje de bienvenida (Ejercicio 1)
    const mensajeBienvenida = document.createElement('div');
    mensajeBienvenida.classList.add('campo-bot');
    mensajeBienvenida.innerHTML = `
        <div class="icono-bot">
            <i class="fas fa-robot icono-bot"></i>
        </div>
        <div class="mensaje-bot">
            <p class="my-2">¡Hola! Bienvenido, ¿en qué puedo ayudarte?</p>
        </div>
    `;
    chatMensajes.prepend(mensajeBienvenida);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;

    // Funcionalidad del chat (Ejercicio 2 y 3)
    sendButton.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText !== '') {
            // Añadir mensaje del usuario (Ejercicio 2)
            const userMessage = document.createElement('div');
            userMessage.classList.add('campo-usuario');
            userMessage.innerHTML = `
                <div class="mensaje-usuario">
                    <p class="my-2">${messageText}</p>
                </div>
                <div class="icono-usuario">
                    <i class="fas fa-user icono-user"></i>
                </div>
            `;
            chatMensajes.appendChild(userMessage);

            // Limpiar el input
            messageInput.value = '';

            // Hacer scroll al final
            chatMensajes.scrollTop = chatMensajes.scrollHeight;

            // Enviar mensaje al servidor y mostrar respuesta (Ejercicio 3)
            sendMessageToServer(messageText, chatMensajes);
        }
    });

    // Enviar mensaje con la tecla Enter
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        }
    });
});

// Función para enviar el mensaje al servidor y mostrar la respuesta (Ejercicio 3)
async function sendMessageToServer(messageText, chatMensajes) {
    try {
        // Realizar la petición POST al servidor
        const response = await fetch('https://albertosalguero.eu.pythonanywhere.com/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageText }),
        });

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error('Error al conectar con el servidor');
        }

        // Obtener la respuesta del servidor como JSON
        const data = await response.json();

        // Mostrar la respuesta del bot
        const botMessage = document.createElement('div');
        botMessage.classList.add('campo-bot');
        botMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">${data.message || 'No se recibió respuesta del servidor'}</p>
            </div>
        `;
        chatMensajes.appendChild(botMessage);

        // Hacer scroll al final
        chatMensajes.scrollTop = chatMensajes.scrollHeight;
    } catch (error) {
        // Mostrar mensaje de error si falla la conexión
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('campo-bot');
        errorMessage.innerHTML = `
            <div class="icono-bot">
                <i class="fas fa-robot icono-bot"></i>
            </div>
            <div class="mensaje-bot">
                <p class="my-2">Error: No se pudo conectar con el servidor</p>
            </div>
        `;
        chatMensajes.appendChild(errorMessage);

        // Hacer scroll al final
        chatMensajes.scrollTop = chatMensajes.scrollHeight;
    }
}