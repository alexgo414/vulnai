import re
import requests

url = 'https://www.uma.es/'
response = requests.get(url)
html = response.text

def scripsFinder(html):
    # busca y guarda los scripts en un archivo scripts.txt
    script_tags = re.findall(r'<script[^>]*>.*?</script>', html, re.DOTALL)

    # eliminar duplicados en scriopt_tags
    script_tags = list(set(script_tags))

    with open('scripts.txt', 'w', encoding='utf-8') as file:
        file.write('')
        for script in script_tags:
            file.write(script + '\n')

def versionFinder():
    # busca y guarda las versiones de los scripts en un archivo versions.txt
    with open('scripts.txt', 'r', encoding='utf-8') as file:
        content = file.read()
        version_tags = re.findall(r'src=["\'][^"\']*/([^/"]+\.js)["\']', content, re.DOTALL)

    # eliminar duplicados en version_tags
    version_tags = list(set(version_tags))

    with open('versiones.txt', 'w', encoding='utf-8') as file:
        file.write('')
        for version in version_tags:
            file.write(version + '\n')

scripsFinder(html)
versionFinder()