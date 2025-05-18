import requests
from time import sleep

def get_server_info(subdomains_file):
    servers = []
    try:
        # Leer subdominios desde el archivo
        with open(subdomains_file, "r", encoding="utf-8") as f:
            subdomains = [line.strip() for line in f if line.strip()]
        
        # Procesar cada subdominio
        for subdomain in subdomains:
            url = f"https://{subdomain}"
            try:
                # Hacer petición GET con timeout
                response = requests.get(url, timeout=5)
                # Obtener la cabecera Server
                server = response.headers.get("Server", "No se ha podido determinar")
                servers.append(f"{url}: {server}")
            except requests.RequestException:
                # Si la petición falla, usar mensaje por defecto
                servers.append(f"{url}: No se ha podido determinar")
            finally:
                # Pausa para evitar sobrecargar el servidor
                sleep(0.5)
        
        # Guardar resultados en servidores.txt
        with open("servidores.txt", "w", encoding="utf-8") as f:
            for server in sorted(servers):
                f.write(f"{server}\n")
        
        print(f"Se han guardado {len(servers)} resultados en servidores.txt")
    
    except FileNotFoundError:
        print(f"Error: El archivo {subdomains_file} no se encuentra")
    except Exception as e:
        print(f"Error inesperado: {e}")

if __name__ == "__main__":
    get_server_info("../5/subdominios.txt")