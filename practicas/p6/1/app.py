import requests
import re
from urllib.parse import urljoin

def get_uma_links():
    base_url = "https://www.uma.es"
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        html = response.text

        # Expresión regular para encontrar enlaces
        links = re.findall(r'href=["\'](.*?)["\']', html)
        
        # Filtrar y procesar enlaces
        uma_links = set()
        for link in links:
            # Convertir enlaces relativos a absolutos
            absolute_link = urljoin(base_url, link)
            # Filtrar solo enlaces de uma.es
            if "uma.es" in absolute_link:
                uma_links.add(absolute_link)
        
        # Guardar enlaces en enlaces.txt
        with open("enlaces.txt", "w", encoding="utf-8") as f:
            for link in sorted(uma_links):
                f.write(f"{link}\n")
        
        print(f"Se han guardado {len(uma_links)} enlaces en enlaces.txt")
    
    except requests.RequestException as e:
        print(f"Error al acceder a la página: {e}")

if __name__ == "__main__":
    get_uma_links()