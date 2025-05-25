// Procesamiento de Markdown y configuración

// ==================== CONFIGURACIÓN DE MARKED.JS ====================

// Configurar marked.js al cargar el módulo
function configurarMarkdown() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {
                        console.warn('Error highlighting code:', err);
                    }
                }
                return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
            },
            breaks: true,
            gfm: true,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            pedantic: false,
            headerIds: false,
            mangle: false
        });
        
        console.log('Marked.js configurado correctamente');
        return true;
    } else {
        console.warn('Marked.js no está disponible');
        return false;
    }
}

// Auto-configurar cuando se carga este módulo
configurarMarkdown();

// También intentar configurar después del DOM si no funcionó antes
document.addEventListener('DOMContentLoaded', () => {
    if (typeof marked !== 'undefined' && !marked.options.highlight) {
        configurarMarkdown();
    }
});

// También configurar si marked se carga después
if (typeof marked === 'undefined') {
    window.addEventListener('load', configurarMarkdown);
}

// ==================== PROCESAMIENTO DE MARKDOWN ====================

function procesarMensajeGemini(contenido) {
    if (!contenido) return '';
    
    if (typeof marked === 'undefined') {
        console.warn('Marked.js no está disponible, devolviendo contenido sin procesar');
        return contenido.replace(/\n/g, '<br>');
    }
    
    let mensajeLimpio = contenido.trim();
    
    try {
        // Preprocesar el contenido para mejorar la renderización
        mensajeLimpio = preprocesarContenido(mensajeLimpio);
        
        // Convertir Markdown a HTML usando marked.js
        let html = marked.parse(mensajeLimpio);
        
        // Sanitizar y mejorar el HTML
        html = sanitizarHTML(html);
        
        return html;
    } catch (error) {
        console.error('Error procesando Markdown:', error);
        return contenido.replace(/\n/g, '<br>');
    }
}

// ==================== PREPROCESAMIENTO ====================

function preprocesarContenido(contenido) {
    // Mejorar el formato de bloques de código
    contenido = contenido.replace(/```(\w+)?\n/g, (match, lang) => {
        return `\`\`\`${lang || 'text'}\n`;
    });
    
    // Asegurar que los bloques de código terminen correctamente
    contenido = contenido.replace(/```\s*$/gm, '\n```');
    
    // Mejorar listas - asegurar espacios correctos
    contenido = contenido.replace(/^(\d+\.|[-*+])\s*(.+)$/gm, '$1 $2');
    
    // Mejorar enlaces - asegurar formato correcto
    contenido = contenido.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');
    
    return contenido;
}

// ==================== SANITIZACIÓN Y MEJORA DE HTML ====================

function sanitizarHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Mejorar bloques de código
    procesarBloquesCodigo(temp);
    
    // Mejorar enlaces
    procesarEnlaces(temp);
    
    // Mejorar listas
    procesarListas(temp);
    
    // Mejorar tablas
    procesarTablas(temp);
    
    // Mejorar párrafos
    procesarParrafos(temp);
    
    // Mejorar títulos
    procesarTitulos(temp);
    
    // Mejorar texto en negrita y cursiva
    procesarTextoEnfasis(temp);
    
    return temp.innerHTML;
}

// ==================== PROCESADORES ESPECÍFICOS ====================

function procesarBloquesCodigo(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((block, index) => {
        block.classList.add('hljs');
        
        // Detectar el lenguaje del código
        const className = block.className;
        const langMatch = className.match(/language-(\w+)/);
        const language = langMatch ? langMatch[1] : 'text';
        
        // Agregar data attribute para el lenguaje
        block.setAttribute('data-language', language);
        
        const pre = block.parentElement;
        pre.style.position = 'relative';
        pre.classList.add('code-block-container');
        
        // Crear header del bloque de código
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
            <span class="code-language">${language.toUpperCase()}</span>
            <button class="copy-code-btn" title="Copiar código" data-code-index="${index}">
                <i class="fas fa-copy"></i>
            </button>
        `;
        
        // Insertar header antes del pre
        pre.parentNode.insertBefore(header, pre);
        
        // Envolver en contenedor
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, header);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        
        // Agregar event listener al botón de copiar
        const copyBtn = header.querySelector('.copy-code-btn');
        copyBtn.addEventListener('click', () => copiarCodigo(block.textContent));
    });
}

function procesarEnlaces(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.classList.add('mensaje-link');
        
        // Agregar icono de enlace externo
        const icon = document.createElement('i');
        icon.className = 'fas fa-external-link-alt ms-1';
        icon.style.fontSize = '0.8em';
        link.appendChild(icon);
    });
}

function procesarListas(container) {
    const listas = container.querySelectorAll('ul, ol');
    listas.forEach(lista => {
        lista.classList.add('mensaje-lista');
        
        // Mejorar elementos de lista
        const items = lista.querySelectorAll('li');
        items.forEach((item, index) => {
            item.classList.add('mensaje-lista-item');
            
            // Agregar animación de entrada progresiva
            item.style.animationDelay = `${index * 0.1}s`;
        });
    });
}

function procesarTablas(container) {
    const tablas = container.querySelectorAll('table');
    tablas.forEach(tabla => {
        tabla.classList.add('mensaje-tabla', 'table', 'table-striped', 'table-hover');
        
        // Envolver tabla en contenedor responsive
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive mensaje-tabla-wrapper';
        tabla.parentNode.insertBefore(wrapper, tabla);
        wrapper.appendChild(tabla);
        
        // Mejorar headers de la tabla
        const headers = tabla.querySelectorAll('th');
        headers.forEach(header => {
            header.classList.add('mensaje-tabla-header');
        });
        
        // Mejorar celdas de la tabla
        const cells = tabla.querySelectorAll('td');
        cells.forEach(cell => {
            cell.classList.add('mensaje-tabla-cell');
        });
    });
}

function procesarParrafos(container) {
    const parrafos = container.querySelectorAll('p');
    parrafos.forEach(parrafo => {
        parrafo.classList.add('mensaje-parrafo');
        
        // Si el párrafo está vacío, eliminarlo
        if (parrafo.textContent.trim() === '') {
            parrafo.remove();
        }
    });
}

function procesarTitulos(container) {
    const titulos = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    titulos.forEach(titulo => {
        titulo.classList.add('mensaje-titulo');
        
        // Agregar icono según el nivel
        const level = parseInt(titulo.tagName.substring(1));
        const icon = document.createElement('i');
        
        switch (level) {
            case 1:
                icon.className = 'fas fa-crown me-2';
                break;
            case 2:
                icon.className = 'fas fa-star me-2';
                break;
            case 3:
                icon.className = 'fas fa-bookmark me-2';
                break;
            default:
                icon.className = 'fas fa-chevron-right me-2';
                break;
        }
        
        titulo.insertBefore(icon, titulo.firstChild);
    });
}

function procesarTextoEnfasis(container) {
    // Mejorar texto en negrita
    const textosNegrita = container.querySelectorAll('strong, b');
    textosNegrita.forEach(texto => {
        texto.classList.add('mensaje-negrita');
    });
    
    // Mejorar texto en cursiva
    const textosCursiva = container.querySelectorAll('em, i');
    textosCursiva.forEach(texto => {
        if (!texto.classList.contains('fas') && !texto.classList.contains('fab') && !texto.classList.contains('far')) {
            texto.classList.add('mensaje-cursiva');
        }
    });
    
    // Mejorar código inline
    const codigoInline = container.querySelectorAll('code:not(pre code)');
    codigoInline.forEach(codigo => {
        codigo.classList.add('mensaje-codigo-inline');
    });
    
    // Mejorar citas
    const citas = container.querySelectorAll('blockquote');
    citas.forEach(cita => {
        cita.classList.add('mensaje-cita');
        
        // Agregar icono de cita
        const icon = document.createElement('i');
        icon.className = 'fas fa-quote-left mensaje-cita-icon';
        cita.insertBefore(icon, cita.firstChild);
    });
}

// ==================== FUNCIONES DE UTILIDAD ====================

function copiarCodigo(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        mostrarNotificacion('Código copiado al portapapeles', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarNotificacion('Error al copiar el código', 'danger');
    });
}

function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.className = `mini-notification ${tipo}`;
    notif.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check' : 'fa-exclamation'} me-2"></i>
        ${mensaje}
    `;
    
    document.body.appendChild(notif);
    
    // Animación de entrada
    setTimeout(() => notif.classList.add('show'), 100);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ==================== FUNCIONES AVANZADAS ====================

// Función para detectar y mejorar diferentes tipos de contenido
function detectarTipoContenido(contenido) {
    const tipos = {
        codigo: /```[\s\S]*?```/g,
        lista: /^[\s]*[-*+]\s+/gm,
        listaNumereada: /^[\s]*\d+\.\s+/gm,
        enlace: /\[([^\]]+)\]\(([^)]+)\)/g,
        titulo: /^#+\s+/gm,
        cita: /^>\s+/gm,
        tabla: /\|.*\|/g,
        codigoInline: /`[^`]+`/g
    };
    
    const resultado = {};
    
    for (const [tipo, regex] of Object.entries(tipos)) {
        const matches = contenido.match(regex);
        resultado[tipo] = matches ? matches.length : 0;
    }
    
    return resultado;
}

// Función para validar Markdown
function validarMarkdown(contenido) {
    const errores = [];
    
    // Verificar bloques de código sin cerrar
    const abiertos = (contenido.match(/```/g) || []).length;
    if (abiertos % 2 !== 0) {
        errores.push('Bloque de código sin cerrar');
    }
    
    // Verificar enlaces malformados
    const enlacesMalformados = contenido.match(/\[([^\]]*)\]\([^)]*$/gm);
    if (enlacesMalformados) {
        errores.push('Enlaces malformados detectados');
    }
    
    // Verificar listas inconsistentes
    const lineasLista = contenido.split('\n').filter(linea => /^[\s]*[-*+]\s+/.test(linea));
    const marcadores = lineasLista.map(linea => linea.match(/^[\s]*[-*+]/)[0]);
    const marcadoresUnicos = [...new Set(marcadores.map(m => m.trim()))];
    if (marcadoresUnicos.length > 1) {
        errores.push('Marcadores de lista inconsistentes');
    }
    
    return {
        esValido: errores.length === 0,
        errores: errores
    };
}

// Función para estadísticas de contenido
function obtenerEstadisticasContenido(contenido) {
    const tipos = detectarTipoContenido(contenido);
    const palabras = contenido.split(/\s+/).length;
    const caracteres = contenido.length;
    const lineas = contenido.split('\n').length;
    
    return {
        palabras,
        caracteres,
        lineas,
        tipos,
        validacion: validarMarkdown(contenido)
    };
}

// ==================== EXPORTACIÓN DE FUNCIONES ====================

// Para compatibilidad con otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        configurarMarkdown,
        procesarMensajeGemini,
        preprocesarContenido,
        sanitizarHTML,
        procesarBloquesCodigo,
        procesarEnlaces,
        procesarListas,
        procesarTablas,
        procesarParrafos,
        procesarTitulos,
        procesarTextoEnfasis,
        copiarCodigo,
        mostrarNotificacion,
        detectarTipoContenido,
        validarMarkdown,
        obtenerEstadisticasContenido
    };
}

// ==================== INICIALIZACIÓN ====================

// Log de inicialización
console.log('Módulo Markdown cargado correctamente');

// Verificar dependencias
if (typeof marked === 'undefined') {
    console.warn('⚠️ Marked.js no está disponible. El procesamiento de Markdown será limitado.');
}

if (typeof hljs === 'undefined') {
    console.warn('⚠️ Highlight.js no está disponible. No habrá syntax highlighting.');
}

// Configurar automáticamente si las dependencias están listas
if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    console.log('✅ Todas las dependencias están disponibles');
    configurarMarkdown();
}