document.addEventListener('DOMContentLoaded', () => {
    // Animation configuration - adjust these values to control speed
    const config = {
        transitionDuration: '2s',    // Duration of each element's animation (longer = slower)
        transitionDelay: '0.8s',     // Delay before animation starts for each element
        delayBetweenSteps: 2000,     // Time between each step starting (milliseconds)
        easing: 'ease-out'           // Animation style: ease, linear, ease-in, ease-out, etc.
    };
    
    let animationDelay = 0;
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add visible class to the main step container after delay
                setTimeout(() => {
                    entry.target.classList.add('step-visible');
                    
                    // Get all elements that need animation inside this step
                    const elementsToAnimate = entry.target.querySelectorAll('.step-header, .step-title, .step-text, .step-image');
                    
                    // Apply transition styles and add visible class to each element
                    elementsToAnimate.forEach((el, index) => {
                        // Apply custom transition styles
                        el.style.transition = `opacity ${config.transitionDuration} ${config.easing} ${config.transitionDelay}, 
                                             transform ${config.transitionDuration} ${config.easing} ${config.transitionDelay}`;
                        
                        // Stagger the animations of inner elements slightly
                        setTimeout(() => {
                            el.classList.add('step-visible');
                        }, index * 200); // Slight delay between elements within the same step
                    });
                }, animationDelay);
                
                // Increase delay for next step
                animationDelay += config.delayBetweenSteps;
                
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.2,  // Trigger when 20% of the element is visible
        rootMargin: '0px 0px -10% 0px' // Slightly above the bottom of viewport
    });

    // Apply initial styles and observe all steps
    document.querySelectorAll('.step').forEach(step => {
        // Add base transition styles to the container
        step.style.transition = `opacity ${config.transitionDuration} ${config.easing}, 
                               transform ${config.transitionDuration} ${config.easing}`;
                               
        // Start observing
        observer.observe(step);
    });
    
    // Optional: Reset animation when scrolling back up
    window.addEventListener('scroll', () => {
        if (window.scrollY < 300) { // Near the top of the page
            animationDelay = 0; // Reset delay counter
        }
    });

    const cardObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('card-pop-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card').forEach(card => {
        cardObserver.observe(card);
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

// Function to scroll to the bottom of the chat container
function scrollToBottom(container) {
    const lastChild = container.lastElementChild;
    if (lastChild) {
        lastChild.scrollIntoView({ behavior: 'smooth',  block: 'nearest' });
    }
}

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

            // Scroll to the bottom of the chat
            scrollToBottom(chatMensajes);
        }
    });

    // Optional: Send message with Enter key
    messageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendButton.click();
        }
    });
});