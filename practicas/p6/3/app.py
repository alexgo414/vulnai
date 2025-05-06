import requests
import re

# URL de la página principal de la UMA
url = 'https://www.uma.es/'

try:
    # Realizar la solicitud HTTP
    response = requests.get(url)

    # Obtener el contenido HTML
    html = response.text

    # Expresión regular para encontrar URLs en el HTML
    # Busca href="..." o src="..." que contengan URLs
    url_pattern = r'(?:href|src)="([^"]*)"'
    urls = re.findall(url_pattern, html)

    # Conjunto para almacenar subdominios únicos
    subdomains = set()

    # Dominio principal
    main_domain = 'uma.es'

    # Procesar cada URL encontrada
    for u in urls:
        # Ignorar URLs vacías o que no contengan un dominio
        if not u or not '.' in u: # Si está vacío o no tiene un punto
            continue

        # Extraer el dominio de la URL
        # Buscar el dominio con una expresión regular
        domain_pattern = r'(?:[a-zA-Z0-9-]+\.)*uma\.es'
        # * significa que el grupo anterior (un segmento seguido de un punto) puede aparecer cero o más veces
        # de la "a" a la "z", A-Z, 0-9 y además se incluyen guiones
        
        match = re.search(domain_pattern, u) # busca la primera coincidencia del patrón domain_pattern en la cadena u
        if match:
            domain = match.group(0) # match.group(0) devuelve la cadena completa que coincide con el patrón
            # Verificar que sea un subdominio (no el dominio principal)
            if domain != main_domain and domain.endswith('.' + main_domain):
                subdomains.add(domain)

    # Guardar los subdominios en un archivo
    with open('subdominios.txt', 'w', encoding='utf-8') as f:
        for subdomain in sorted(subdomains):
            f.write(subdomain + '\n')

    print(f"Se han encontrado {len(subdomains)} subdominios. Guardados en 'subdominios.txt'.")
    print("Subdominios encontrados:", subdomains)

except requests.RequestException as e:
    print(f"Error al descargar la página: {e}")
except Exception as e:
    print(f"Error durante la ejecución: {e}")