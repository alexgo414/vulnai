import sys
import socket
import os

def brute_force_subdomains(domain, subdomain_file, output_file, limit=10):
    """Busca subdominios válidos para un dominio usando una lista de subdominios."""
    subdomains_found = []
    
    # Verificar si el archivo de subdominios existe
    if not os.path.exists(subdomain_file):
        print(f"Error: El archivo '{subdomain_file}' no existe.")
        sys.exit(1)
    
    # Leer la lista de subdominios
    try:
        with open(subdomain_file, 'r', encoding='utf-8') as f:
            subdomains = [line.strip() for line in f if line.strip()]
            # Limitar a los primeros 'limit' subdominios
            subdomains = subdomains[:limit]
            # print("Subdominios a probar:", subdomains) esto para comprobar
    except IOError as e:
        print(f"Error al leer '{subdomain_file}': {e}")
        sys.exit(1)
    
    print(f"Probando {len(subdomains)} subdominios para '{domain}'...")
    
    # Probar cada subdominio
    for subdomain in subdomains:
        # Validar longitud del subdominio
        if not subdomain or len(subdomain) > 63:
            continue
        test_domain = f"{subdomain}.{domain}"
        try:
            socket.gethostbyname(test_domain)
            print(f"Subdominio encontrado: {test_domain}")
            subdomains_found.append(test_domain)
        except (socket.gaierror, UnicodeError):
            continue
    
    # Guardar los subdominios encontrados
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            for subdomain in sorted(subdomains_found):
                f.write(subdomain + '\n')
        print(f"Se encontraron {len(subdomains_found)} subdominios. Guardados en '{output_file}'.")
    except IOError as e:
        print(f"Error al escribir en '{output_file}': {e}")
        sys.exit(1)

def main():
    # Verificar argumentos
    if len(sys.argv) != 3:
        print("Uso: python app.py <dominio> <archivo_subdominios>")
        print("Ejemplo: python app.py uma.es lista.txt")
        sys.exit(1)
    
    domain = sys.argv[1]
    subdomain_file = sys.argv[2]
    output_file = 'subdominios.txt'
    
    # Validar el dominio
    if not domain or '.' not in domain:
        print("Error: Dominio inválido.")
        sys.exit(1)
    
    print("Directorio de trabajo actual:", os.getcwd())
    brute_force_subdomains(domain, subdomain_file, output_file, limit=10)

if __name__ == "__main__":
    main()