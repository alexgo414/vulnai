from googlesearch import search
import tldextract
import sys

def obtener_subdominios(dominio, num_resultados=50):
    consulta = f"site:{dominio}"
    urls = search(consulta, num_results=num_resultados)
    subdominios = set()

    for url in urls:
        ext = tldextract.extract(url)
        subdominio = ext.subdomain
        if subdominio and subdominio != 'www':
            subdominios.add(f"{subdominio}.{dominio}")

    return sorted(subdominios)

if __name__ == "__main__":

    # el primer argumento es el dominio, el segundo es el número de resultados
    dominio=sys.argv[1]
    paginas=sys.argv[2]
    num_resultados=int(paginas)*10
    subdominios = obtener_subdominios(dominio,num_resultados)

    if subdominios:
        with open("subdominios.txt", "w", encoding="utf-8") as f:
            for sub in subdominios:
                f.write(sub + "\n")
        print("Subdominios guardados en subdominios.txt")
    else:
        print("No se encontraron subdominios.")

