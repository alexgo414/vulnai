import os
import uuid
import json
import time
import xml.etree.ElementTree as ET
import requests
import re
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import random
import google.generativeai as genai
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import asyncio
import traceback

# ✅ CARGAR CONFIGURACIÓN
load_dotenv()

app = Flask(__name__)

# ✅ CONFIGURACIÓN BÁSICA (mismo código anterior)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "chat-secret-key")
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app, 
     origins=[
        "http://localhost:5003",
        "http://127.0.0.1:5003"
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Cookie"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# ✅ CONFIGURACIÓN AI
try:
    genai.configure(api_key=os.getenv("api_key"))
    model = genai.GenerativeModel("gemini-2.0-flash")
    print("✅ Gemini AI configurado correctamente")
except Exception as e:
    print(f"⚠️ Error configurando Gemini AI: {e}")
    model = None

# 🧠 HISTORIAL DE CONVERSACIONES POR USUARIO
historial_conversaciones = {}

# 📁 EXTENSIONES DE ARCHIVO PERMITIDAS PARA SBOM
ALLOWED_EXTENSIONS = {'json', 'xml', 'yaml', 'yml', 'spdx', 'txt'}

# 🔒 CONFIGURACIÓN NVD API
NVD_API_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
NVD_API_KEY = os.getenv("NVD_API_KEY")  # Opcional pero recomendado para rate limits mejores

# 🗂️ CACHE PARA CONSULTAS NVD (evitar consultas repetitivas)
nvd_cache = {}
cache_expiry = {}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def obtener_usuario_id(request):
    """Obtiene un ID único para el usuario actual"""
    user_id = request.cookies.get('username', 'anonymous')
    return user_id

def formatear_historial_para_ai(historial):
    """Convierte el historial en un formato que entienda la AI"""
    if not historial:
        return "Eres un experto en ciberseguridad y análisis de SBOM (Software Bill of Materials). Puedes analizar archivos SBOM en formatos JSON, XML, SPDX y YAML y consultar vulnerabilidades en la National Vulnerability Database."
    
    contexto = "Contexto de la conversación anterior:\n"
    for entrada in historial[-10:]:  # Últimos 10 mensajes
        contexto += f"- {entrada}\n"
    
    contexto += "\nResponde de manera coherente considerando el contexto anterior."
    return contexto

# ✅ NUEVA FUNCIÓN PARA CONSULTAR NVD
def limpiar_cache_expirado():
    """Limpia entradas de cache que han expirado"""
    now = datetime.now()
    expired_keys = [key for key, expiry in cache_expiry.items() if now > expiry]
    for key in expired_keys:
        nvd_cache.pop(key, None)
        cache_expiry.pop(key, None)

def normalizar_nombre_componente(nombre):
    """Normaliza el nombre del componente para búsqueda en NVD"""
    # Convertir a minúsculas
    nombre = nombre.lower()
    
    # Remover prefijos comunes de package managers
    prefijos_remover = ['@', 'npm:', 'pkg:', 'maven:', 'pypi:']
    for prefijo in prefijos_remover:
        if nombre.startswith(prefijo):
            nombre = nombre[len(prefijo):]
    
    # Remover caracteres especiales y reemplazar con espacios
    nombre = re.sub(r'[^a-zA-Z0-9\s\-\.]', ' ', nombre)
    
    # Normalizar espacios
    nombre = ' '.join(nombre.split())
    
    return nombre

def extraer_cpes_de_componente(componente):
    """Extrae posibles CPEs de un componente"""
    cpes = []
    
    nombre = componente.get('nombre', '').lower()
    version = componente.get('version', '')
    
    # Si hay PURL, intentar extraer información
    purl = componente.get('purl', '')
    if purl:
        # Ejemplo: pkg:npm/lodash@4.17.20
        purl_match = re.match(r'pkg:([^/]+)/([^@]+)@?([^?]*)', purl)
        if purl_match:
            ecosystem, name, ver = purl_match.groups()
            nombre = name.lower()
            if ver:
                version = ver
    
    # Generar posibles CPEs
    nombre_normalizado = normalizar_nombre_componente(nombre)
    
    # CPE básico
    if version:
        cpes.append(f"cpe:2.3:a:*:{nombre_normalizado}:{version}:*:*:*:*:*:*:*")
        cpes.append(f"cpe:2.3:a:{nombre_normalizado}:{nombre_normalizado}:{version}:*:*:*:*:*:*:*")
    
    return cpes

async def buscar_vulnerabilidades_nvd(componente, max_retries=3):
    """Busca vulnerabilidades para un componente en NVD"""
    limpiar_cache_expirado()
    
    nombre = componente.get('nombre', '')
    version = componente.get('version', '')
    
    # Crear clave de cache
    cache_key = f"{nombre}:{version}"
    
    # Verificar cache
    if cache_key in nvd_cache:
        print(f"🔄 Usando cache para {nombre}:{version}")
        return nvd_cache[cache_key]
    
    vulnerabilidades = []
    
    try:
        # Buscar por nombre de producto
        search_params = {
            'keywordSearch': normalizar_nombre_componente(nombre),
            'resultsPerPage': 20,
            'startIndex': 0
        }
        
        headers = {
            'User-Agent': 'SVAIA-Security-Scanner/1.0'
        }
        
        if NVD_API_KEY:
            headers['apiKey'] = NVD_API_KEY
        
        print(f"🔍 Buscando vulnerabilidades para: {nombre} {version}")
        
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    NVD_API_BASE_URL,
                    params=search_params,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    break
                elif response.status_code == 403:
                    print(f"⚠️ Rate limit alcanzado, esperando...")
                    time.sleep(2 ** attempt)
                else:
                    print(f"⚠️ Error {response.status_code} en intento {attempt + 1}")
                    time.sleep(1)
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Error de conexión en intento {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise
        
        if response.status_code != 200:
            print(f"❌ Error final en NVD API: {response.status_code}")
            return []
        
        data = response.json()
        
        if 'vulnerabilities' not in data:
            print(f"⚠️ No se encontraron vulnerabilidades para {nombre}")
            # Cache resultado vacío por 1 hora
            nvd_cache[cache_key] = []
            cache_expiry[cache_key] = datetime.now() + timedelta(hours=1)
            return []
        
        for vuln_item in data['vulnerabilities']:
            try:
                cve_data = vuln_item['cve']
                cve_id = cve_data['id']
                
                # Verificar si el CVE es relevante para este componente
                if es_vulnerabilidad_relevante(cve_data, componente):
                    vuln_info = {
                        'cve_id': cve_id,
                        'descripcion': extraer_descripcion_cve(cve_data),
                        'severidad': extraer_severidad_cve(cve_data),
                        'score_cvss': extraer_score_cvss(cve_data),
                        'vector_cvss': extraer_vector_cvss(cve_data),
                        'fecha_publicacion': extraer_fecha_publicacion(cve_data),
                        'referencias': extraer_referencias_cve(cve_data)[:3],  # Solo primeras 3
                        'productos_afectados': extraer_productos_afectados(cve_data)
                    }
                    vulnerabilidades.append(vuln_info)
            
            except Exception as e:
                print(f"⚠️ Error procesando CVE individual: {e}")
                continue
        
        # Filtrar y ordenar por severidad
        vulnerabilidades = sorted(vulnerabilidades, 
                                key=lambda x: x.get('score_cvss', 0), 
                                reverse=True)[:10]  # Top 10 más críticos
        
        # Cache por 24 horas
        nvd_cache[cache_key] = vulnerabilidades
        cache_expiry[cache_key] = datetime.now() + timedelta(hours=24)
        
        print(f"✅ Encontradas {len(vulnerabilidades)} vulnerabilidades para {nombre}")
        
        # Rate limiting cortés
        time.sleep(0.5)
        
        return vulnerabilidades
        
    except Exception as e:
        print(f"❌ Error consultando NVD para {nombre}: {e}")
        return []

def es_vulnerabilidad_relevante(cve_data, componente):
    """Determina si una vulnerabilidad es relevante para el componente"""
    nombre_componente = componente.get('nombre', '').lower()
    version_componente = componente.get('version', '')
    
    # Buscar en descripciones
    descripcion = extraer_descripcion_cve(cve_data).lower()
    if nombre_componente in descripcion:
        return True
    
    # Buscar en CPEs configuradas
    try:
        configurations = cve_data.get('configurations', {}).get('nodes', [])
        for node in configurations:
            cpe_matches = node.get('cpeMatch', [])
            for cpe_match in cpe_matches:
                cpe_name = cpe_match.get('criteria', '').lower()
                if nombre_componente in cpe_name:
                    return True
    except:
        pass
    
    return False

def extraer_descripcion_cve(cve_data):
    """Extrae descripción del CVE"""
    try:
        descriptions = cve_data.get('descriptions', [])
        for desc in descriptions:
            if desc.get('lang') == 'en':
                return desc.get('value', 'Sin descripción disponible')
        return descriptions[0].get('value', 'Sin descripción disponible') if descriptions else 'Sin descripción disponible'
    except:
        return 'Sin descripción disponible'

def extraer_severidad_cve(cve_data):
    """Extrae severidad del CVE"""
    try:
        metrics = cve_data.get('metrics', {})
        
        # CVSSv3.1 primero
        if 'cvssMetricV31' in metrics:
            return metrics['cvssMetricV31'][0]['cvssData']['baseSeverity']
        # CVSSv3.0 como fallback
        elif 'cvssMetricV30' in metrics:
            return metrics['cvssMetricV30'][0]['cvssData']['baseSeverity']
        # CVSSv2 como último recurso
        elif 'cvssMetricV2' in metrics:
            score = metrics['cvssMetricV2'][0]['cvssData']['baseScore']
            if score >= 7.0:
                return 'HIGH'
            elif score >= 4.0:
                return 'MEDIUM'
            else:
                return 'LOW'
        
        return 'UNKNOWN'
    except:
        return 'UNKNOWN'

def extraer_score_cvss(cve_data):
    """Extrae score CVSS del CVE"""
    try:
        metrics = cve_data.get('metrics', {})
        
        if 'cvssMetricV31' in metrics:
            return metrics['cvssMetricV31'][0]['cvssData']['baseScore']
        elif 'cvssMetricV30' in metrics:
            return metrics['cvssMetricV30'][0]['cvssData']['baseScore']
        elif 'cvssMetricV2' in metrics:
            return metrics['cvssMetricV2'][0]['cvssData']['baseScore']
        
        return 0.0
    except:
        return 0.0

def extraer_vector_cvss(cve_data):
    """Extrae vector CVSS del CVE"""
    try:
        metrics = cve_data.get('metrics', {})
        
        if 'cvssMetricV31' in metrics:
            return metrics['cvssMetricV31'][0]['cvssData']['vectorString']
        elif 'cvssMetricV30' in metrics:
            return metrics['cvssMetricV30'][0]['cvssData']['vectorString']
        elif 'cvssMetricV2' in metrics:
            return metrics['cvssMetricV2'][0]['cvssData']['vectorString']
        
        return 'N/A'
    except:
        return 'N/A'

def extraer_fecha_publicacion(cve_data):
    """Extrae fecha de publicación del CVE"""
    try:
        return cve_data.get('published', 'N/A')
    except:
        return 'N/A'

def extraer_referencias_cve(cve_data):
    """Extrae referencias del CVE"""
    try:
        referencias = []
        refs = cve_data.get('references', [])
        for ref in refs[:5]:  # Máximo 5 referencias
            referencias.append({
                'url': ref.get('url', ''),
                'source': ref.get('source', 'Unknown')
            })
        return referencias
    except:
        return []

def extraer_productos_afectados(cve_data):
    """Extrae productos afectados del CVE"""
    try:
        productos = set()
        configurations = cve_data.get('configurations', {}).get('nodes', [])
        for node in configurations:
            cpe_matches = node.get('cpeMatch', [])
            for cpe_match in cpe_matches[:3]:  # Máximo 3 productos
                cpe_name = cpe_match.get('criteria', '')
                if cpe_name:
                    productos.add(cpe_name)
        return list(productos)
    except:
        return []

def procesar_archivo_sbom(file_path, filename):
    """
    Procesa diferentes formatos de SBOM y extrae información relevante
    """
    try:
        extension = filename.rsplit('.', 1)[1].lower()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if extension == 'json':
            return procesar_sbom_json(content)
        elif extension in ['xml', 'spdx']:
            return procesar_sbom_xml(content)
        elif extension in ['yaml', 'yml']:
            return procesar_sbom_yaml(content)
        else:
            return procesar_sbom_texto(content)
            
    except Exception as e:
        return f"Error procesando archivo SBOM: {str(e)}"

def procesar_sbom_json(content):
    """Procesa SBOM en formato JSON (CycloneDX, SPDX-JSON)"""
    try:
        data = json.loads(content)
        
        # Detectar formato
        if 'bomFormat' in data and data['bomFormat'] == 'CycloneDX':
            return procesar_cyclonedx(data)
        elif 'spdxVersion' in data:
            return procesar_spdx_json(data)
        else:
            return procesar_sbom_generico(data)
            
    except json.JSONDecodeError as e:
        return f"Error parseando JSON: {str(e)}"

# ✅ ACTUALIZAR FUNCIÓN DE PROCESAMIENTO DE SBOM PARA INCLUIR NVD
def procesar_cyclonedx(data):
    """Procesa SBOM en formato CycloneDX con consulta a NVD"""
    resultado = {
        'formato': 'CycloneDX',
        'version': data.get('specVersion', 'No especificada'),
        'componentes': [],
        'vulnerabilidades': [],
        'vulnerabilidades_nvd': [],  # ✅ NUEVO: Vulnerabilidades de NVD
        'resumen': {}
    }
    
    # Información del componente principal
    if 'metadata' in data and 'component' in data['metadata']:
        main_component = data['metadata']['component']
        resultado['componente_principal'] = {
            'nombre': main_component.get('name', 'No especificado'),
            'version': main_component.get('version', 'No especificada'),
            'tipo': main_component.get('type', 'No especificado')
        }
    
    # Procesar componentes
    if 'components' in data:
        for component in data['components']:
            comp_info = {
                'nombre': component.get('name', 'No especificado'),
                'version': component.get('version', 'No especificada'),
                'tipo': component.get('type', 'library'),
                'purl': component.get('purl', ''),
                'licencias': []
            }
            
            # Extraer licencias
            if 'licenses' in component:
                for license_info in component['licenses']:
                    if 'license' in license_info:
                        if 'name' in license_info['license']:
                            comp_info['licencias'].append(license_info['license']['name'])
                        elif 'id' in license_info['license']:
                            comp_info['licencias'].append(license_info['license']['id'])
            
            resultado['componentes'].append(comp_info)
    
    # Procesar vulnerabilidades existentes en el SBOM
    if 'vulnerabilities' in data:
        for vuln in data['vulnerabilities']:
            vuln_info = {
                'id': vuln.get('id', 'No especificado'),
                'descripcion': vuln.get('description', 'No disponible'),
                'severidad': '',
                'componentes_afectados': []
            }
            
            # Extraer severidad
            if 'ratings' in vuln:
                for rating in vuln['ratings']:
                    if 'severity' in rating:
                        vuln_info['severidad'] = rating['severity']
                        break
            
            # Componentes afectados
            if 'affects' in vuln:
                for affect in vuln['affects']:
                    if 'ref' in affect:
                        vuln_info['componentes_afectados'].append(affect['ref'])
            
            resultado['vulnerabilidades'].append(vuln_info)
    
    # Generar resumen
    resultado['resumen'] = {
        'total_componentes': len(resultado['componentes']),
        'total_vulnerabilidades': len(resultado['vulnerabilidades']),
        'tipos_componentes': list(set([comp['tipo'] for comp in resultado['componentes']])),
        'licencias_unicas': list(set([lic for comp in resultado['componentes'] for lic in comp['licencias']]))
    }
    
    return resultado

def procesar_spdx_json(data):
    """Procesa SBOM en formato SPDX JSON"""
    resultado = {
        'formato': 'SPDX',
        'version': data.get('spdxVersion', 'No especificada'),
        'componentes': [],
        'resumen': {}
    }
    
    # Procesar paquetes
    if 'packages' in data:
        for package in data['packages']:
            comp_info = {
                'nombre': package.get('name', 'No especificado'),
                'version': package.get('versionInfo', 'No especificada'),
                'spdx_id': package.get('SPDXID', ''),
                'download_location': package.get('downloadLocation', ''),
                'licencias': []
            }
            
            # Extraer información de licencias
            if 'licenseConcluded' in package:
                comp_info['licencias'].append(package['licenseConcluded'])
            if 'licenseDeclared' in package:
                comp_info['licencias'].append(package['licenseDeclared'])
            
            resultado['componentes'].append(comp_info)
    
    resultado['resumen'] = {
        'total_componentes': len(resultado['componentes']),
        'licencias_unicas': list(set([lic for comp in resultado['componentes'] for lic in comp['licencias'] if lic != 'NOASSERTION']))
    }
    
    return resultado

def procesar_sbom_xml(content):
    """Procesa SBOM en formato XML"""
    try:
        root = ET.fromstring(content)
        
        # Detectar si es SPDX XML o CycloneDX XML
        if 'spdx' in root.tag.lower():
            return procesar_spdx_xml(root)
        elif 'bom' in root.tag.lower():
            return procesar_cyclonedx_xml(root)
        else:
            return {"formato": "XML genérico", "contenido": "Formato XML no reconocido"}
            
    except ET.ParseError as e:
        return f"Error parseando XML: {str(e)}"

def procesar_spdx_xml(root):
    """Procesa SPDX en formato XML (stub básico)"""
    resultado = {
        'formato': 'SPDX XML',
        'componentes': [],
        'resumen': {}
    }
    # Buscar paquetes/componentes SPDX
    for package in root.findall('.//{*}Package'):
        name = package.findtext('{*}name', default='No especificado')
        version = package.findtext('{*}versionInfo', default='No especificada')
        spdx_id = package.findtext('{*}SPDXID', default='')
        licencias = []
        license_concluded = package.findtext('{*}licenseConcluded')
        if license_concluded:
            licencias.append(license_concluded)
        license_declared = package.findtext('{*}licenseDeclared')
        if license_declared:
            licencias.append(license_declared)
        resultado['componentes'].append({
            'nombre': name,
            'version': version,
            'spdx_id': spdx_id,
            'licencias': licencias
        })
    resultado['resumen'] = {
        'total_componentes': len(resultado['componentes']),
        'licencias_unicas': list(set([lic for comp in resultado['componentes'] for lic in comp['licencias'] if lic != 'NOASSERTION']))
    }
    return resultado

def procesar_cyclonedx_xml(root):
    """Procesa CycloneDX en formato XML"""
    resultado = {
        'formato': 'CycloneDX XML',
        'componentes': [],
        'resumen': {}
    }
    
    # Buscar componentes
    components_elem = root.find('.//{http://cyclonedx.org/schema/bom/1.4}components')
    if components_elem is not None:
        for component in components_elem.findall('.//{http://cyclonedx.org/schema/bom/1.4}component'):
            name = component.get('name', 'No especificado')
            version = component.get('version', 'No especificada')
            comp_type = component.get('type', 'library')
            
            resultado['componentes'].append({
                'nombre': name,
                'version': version,
                'tipo': comp_type
            })
    
    resultado['resumen'] = {
        'total_componentes': len(resultado['componentes'])
    }
    
    return resultado

def procesar_sbom_yaml(content):
    """Procesa SBOM en formato YAML"""
    try:
        import yaml
        data = yaml.safe_load(content)
        
        # Si es YAML, probablemente sea similar al JSON
        if isinstance(data, dict):
            if 'bomFormat' in data and data['bomFormat'] == 'CycloneDX':
                return procesar_cyclonedx(data)
            elif 'spdxVersion' in data:
                return procesar_spdx_json(data)
            else:
                return procesar_sbom_generico(data)
        else:
            return {"formato": "YAML", "error": "Formato YAML no reconocido"}
            
    except Exception as e:
        return f"Error procesando YAML: {str(e)}"

def procesar_sbom_texto(content):
    """Procesa archivos SBOM en formato texto plano"""
    return {
        'formato': 'Texto plano',
        'tamaño': len(content),
        'lineas': len(content.split('\n')),
        'vista_previa': content[:500] + "..." if len(content) > 500 else content
    }

def procesar_sbom_generico(data):
    """Procesador genérico para formatos no reconocidos"""
    return {
        'formato': 'Genérico/Desconocido',
        'claves_principales': list(data.keys()) if isinstance(data, dict) else [],
        'tipo_datos': type(data).__name__
    }

# ✅ NUEVA FUNCIÓN PARA ENRIQUECER SBOM CON DATOS DE NVD
async def enriquecer_sbom_con_nvd(sbom_data):
    """Enriquece el SBOM con vulnerabilidades de NVD"""
    if not isinstance(sbom_data, dict) or 'componentes' not in sbom_data:
        return sbom_data
    
    print("🔍 Enriqueciendo SBOM con datos de NVD...")
    
    vulnerabilidades_nvd = []
    componentes_analizados = 0
    componentes_con_vulns = 0

    # Analizar solo los primeros 5 componentes para evitar timeouts
    componentes_a_analizar = sbom_data['componentes'][:5]
    
    for componente in componentes_a_analizar:
        componentes_analizados += 1
        
        try:
            # Buscar vulnerabilidades para este componente
            vulns = await buscar_vulnerabilidades_nvd(componente)
            
            if vulns:
                componentes_con_vulns += 1
                
                for vuln in vulns:
                    vuln['componente_afectado'] = {
                        'nombre': componente.get('nombre'),
                        'version': componente.get('version'),
                        'tipo': componente.get('tipo', 'library')
                    }
                    vulnerabilidades_nvd.append(vuln)
            
        except Exception as e:
            print(f"⚠️ Error analizando componente {componente.get('nombre', 'unknown')}: {e}")
            continue
    
    # Añadir vulnerabilidades de NVD al resultado
    sbom_data['vulnerabilidades_nvd'] = vulnerabilidades_nvd
    
    # Actualizar resumen
    if 'resumen' not in sbom_data:
        sbom_data['resumen'] = {}
    
    sbom_data['resumen']['nvd_analysis'] = {
        'componentes_analizados': componentes_analizados,
        'componentes_con_vulnerabilidades': componentes_con_vulns,
        'total_vulnerabilidades_nvd': len(vulnerabilidades_nvd),
        'severidades_encontradas': list(set([v.get('severidad', 'UNKNOWN') for v in vulnerabilidades_nvd]))
    }
    
    print(f"✅ Análisis NVD completado: {len(vulnerabilidades_nvd)} vulnerabilidades encontradas")
    
    return sbom_data

# ✅ ACTUALIZAR FUNCIÓN PARA GENERAR PROMPT CON DATOS DE NVD
def generar_prompt_sbom(sbom_data, mensaje_usuario):
    """Genera un prompt específico para análisis de SBOM con datos de NVD"""
    
    prompt_parts = []
    
    # Introducción
    prompt_parts.append("Como experto en ciberseguridad y análisis de SBOM, he recibido un archivo SBOM para análisis.")
    prompt_parts.append("He consultado la National Vulnerability Database (NVD) para obtener información actualizada sobre vulnerabilidades.")
    prompt_parts.append("")
    
    # Información básica del SBOM
    formato = sbom_data.get('formato', 'No especificado')
    total_componentes = sbom_data.get('resumen', {}).get('total_componentes', 'No disponible')
    
    prompt_parts.append("INFORMACIÓN DEL SBOM:")
    prompt_parts.append(f"- Formato: {formato}")
    prompt_parts.append(f"- Total de componentes: {total_componentes}")
    prompt_parts.append("")
    
    # Componente principal (si existe)
    if 'componente_principal' in sbom_data:
        comp = sbom_data['componente_principal']
        prompt_parts.append("COMPONENTE PRINCIPAL:")
        prompt_parts.append(f"- Nombre: {comp.get('nombre', 'No especificado')}")
        prompt_parts.append(f"- Versión: {comp.get('version', 'No especificada')}")
        prompt_parts.append(f"- Tipo: {comp.get('tipo', 'No especificado')}")
        prompt_parts.append("")
    
    # ✅ VULNERABILIDADES DE NVD
    if sbom_data.get('vulnerabilidades_nvd'):
        vulnerabilidades_nvd = sbom_data['vulnerabilidades_nvd']
        nvd_analysis = sbom_data.get('resumen', {}).get('nvd_analysis', {})
        
        prompt_parts.append("ANÁLISIS DE VULNERABILIDADES (NATIONAL VULNERABILITY DATABASE):")
        prompt_parts.append(f"- Componentes analizados: {nvd_analysis.get('componentes_analizados', 0)}")
        prompt_parts.append(f"- Componentes con vulnerabilidades: {nvd_analysis.get('componentes_con_vulnerabilidades', 0)}")
        prompt_parts.append(f"- Total vulnerabilidades encontradas: {len(vulnerabilidades_nvd)}")
        
        # Agrupar por severidad
        severidades = {}
        for vuln in vulnerabilidades_nvd:
            sev = vuln.get('severidad', 'UNKNOWN')
            if sev not in severidades:
                severidades[sev] = 0
            severidades[sev] += 1
        
        prompt_parts.append("- Distribución por severidad:")
        for sev, count in sorted(severidades.items(), key=lambda x: {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0}.get(x[0], 0), reverse=True):
            prompt_parts.append(f"  * {sev}: {count}")
        
        # Mostrar las vulnerabilidades más críticas
        vulns_criticas = sorted(vulnerabilidades_nvd, 
                               key=lambda x: x.get('score_cvss', 0), 
                               reverse=True)[:5]
        
        if vulns_criticas:
            prompt_parts.append("")
            prompt_parts.append("VULNERABILIDADES MÁS CRÍTICAS:")
            for vuln in vulns_criticas:
                comp = vuln.get('componente_afectado', {})
                prompt_parts.append(f"- {vuln.get('cve_id', 'CVE-Unknown')} en {comp.get('nombre', 'Unknown')} {comp.get('version', '')}")
                prompt_parts.append(f"  * Severidad: {vuln.get('severidad', 'UNKNOWN')} (Score: {vuln.get('score_cvss', 0)})")
                prompt_parts.append(f"  * Descripción: {vuln.get('descripcion', 'Sin descripción')[:100]}...")
        
        prompt_parts.append("")
    
    # Vulnerabilidades originales del SBOM (si existen)
    if sbom_data.get('vulnerabilidades'):
        vulnerabilidades = sbom_data['vulnerabilidades']
        prompt_parts.append(f"VULNERABILIDADES EN EL SBOM ORIGINAL: {len(vulnerabilidades)}")
        
        for vuln in vulnerabilidades[:3]:  # Mostrar solo las primeras 3
            vuln_id = vuln.get('id', 'Sin ID')
            severidad = vuln.get('severidad', 'Sin severidad')
            prompt_parts.append(f"- {vuln_id}: {severidad}")
        
        prompt_parts.append("")
    
    # Licencias (si existen)
    resumen = sbom_data.get('resumen', {})
    if resumen.get('licencias_unicas'):
        licencias_todas = resumen['licencias_unicas']
        licencias_mostrar = licencias_todas[:8]  # Primeras 8 licencias
        
        prompt_parts.append(f"LICENCIAS DETECTADAS ({len(licencias_mostrar)} de {len(licencias_todas)}):")
        prompt_parts.append(", ".join(licencias_mostrar))
        prompt_parts.append("")
    
    # Consulta del usuario
    prompt_parts.append(f"CONSULTA DEL USUARIO: {mensaje_usuario}")
    prompt_parts.append("")
    
    # Instrucciones específicas
    prompt_parts.append("INSTRUCCIONES PARA EL ANÁLISIS:")
    prompt_parts.append("1. Proporciona un análisis detallado de seguridad basado en el SBOM y las vulnerabilidades encontradas en NVD")
    prompt_parts.append("2. Prioriza las vulnerabilidades críticas y de alta severidad")
    prompt_parts.append("3. Sugiere acciones específicas de mitigación para cada vulnerabilidad crítica")
    prompt_parts.append("4. Evalúa el riesgo general del proyecto basado en los hallazgos")
    prompt_parts.append("5. Identifica patrones de riesgo en las dependencias")
    prompt_parts.append("")
    
    # Formato de respuesta
    prompt_parts.append("FORMATO DE RESPUESTA:")
    prompt_parts.append("- Usa **negrita** para CVEs y puntos críticos")
    prompt_parts.append("- Usa *cursiva* para severidades y nombres de componentes")
    prompt_parts.append("- Organiza en secciones: Resumen Ejecutivo, Vulnerabilidades Críticas, Recomendaciones")
    prompt_parts.append("- Incluye `código` para nombres técnicos de componentes")
    prompt_parts.append("- Usa ### para separar secciones importantes")
    
    prompt_completo = "\n".join(prompt_parts)
    return prompt_completo

def validar_contenido_sbom(content, filename):
    """
    Valida si el contenido es realmente un SBOM antes de procesarlo
    """
    try:
        extension = filename.rsplit('.', 1)[1].lower()
        
        if extension == 'json':
            data = json.loads(content)
            return validar_sbom_json(data)
        elif extension in ['xml', 'spdx']:
            return validar_sbom_xml(content)
        elif extension in ['yaml', 'yml']:
            import yaml
            data = yaml.safe_load(content)
            return validar_sbom_yaml(data)
        else:
            # Para archivos de texto, verificar palabras clave
            return validar_sbom_texto(content)
            
    except Exception as e:
        return False, f"Error validando archivo: {str(e)}"

def validar_sbom_json(data):
    """Valida si un JSON es un SBOM válido"""
    if not isinstance(data, dict):
        return False, "El archivo no contiene un objeto JSON válido"
    
    # Verificar CycloneDX
    if 'bomFormat' in data and data['bomFormat'] == 'CycloneDX':
        if 'specVersion' in data:
            return True, "SBOM CycloneDX válido detectado"
    
    # Verificar SPDX
    if 'spdxVersion' in data:
        if 'packages' in data or 'documentName' in data:
            return True, "SBOM SPDX válido detectado"
    
    # Verificar si contiene componentes típicos de SBOM
    sbom_keys = ['components', 'packages', 'dependencies', 'vulnerabilities', 'licenses']
    found_keys = [key for key in sbom_keys if key in data]
    
    if len(found_keys) >= 2:
        return True, f"SBOM genérico detectado (contiene: {', '.join(found_keys)})"
    
    return False, "El archivo JSON no parece ser un SBOM válido"

def validar_sbom_xml(content):
    """Valida si un XML es un SBOM válido"""
    try:
        root = ET.fromstring(content)
        
        # Verificar CycloneDX XML
        if 'cyclonedx.org' in str(root.tag) or 'bom' in root.tag.lower():
            return True, "SBOM CycloneDX XML válido detectado"
        
        # Verificar SPDX XML
        if 'spdx' in root.tag.lower() or any('spdx' in elem.tag.lower() for elem in root.iter()):
            return True, "SBOM SPDX XML válido detectado"
        
        # Verificar elementos típicos de SBOM
        sbom_elements = ['component', 'package', 'dependency', 'vulnerability', 'license']
        found_elements = []
        
        for elem in root.iter():
            tag_lower = elem.tag.lower()
            for sbom_elem in sbom_elements:
                if sbom_elem in tag_lower:
                    found_elements.append(sbom_elem)
        
        if len(set(found_elements)) >= 2:
            return True, f"SBOM XML genérico detectado (contiene: {', '.join(set(found_elements))})"
        
        return False, "El archivo XML no parece ser un SBOM válido"
        
    except ET.ParseError as e:
        return False, f"Error parseando XML: {str(e)}"

def validar_sbom_yaml(data):
    """Valida si un YAML es un SBOM válido"""
    if isinstance(data, dict):
        # Verificar CycloneDX YAML
        if 'bomFormat' in data and data['bomFormat'] == 'CycloneDX':
            return True, "SBOM CycloneDX YAML válido detectado"
        
        # Verificar SPDX YAML
        if 'spdxVersion' in data:
            return True, "SBOM SPDX YAML válido detectado"
        
        # Verificar claves típicas de SBOM
        sbom_keys = ['components', 'packages', 'dependencies', 'vulnerabilities']
        found_keys = [key for key in sbom_keys if key in data]
        
        if len(found_keys) >= 1:
            return True, f"SBOM YAML genérico detectado (contiene: {', '.join(found_keys)})"
    
    return False, "El archivo YAML no parece ser un SBOM válido"

def validar_sbom_texto(content):
    """Valida si un archivo de texto contiene información de SBOM"""
    content_lower = content.lower()
    
    # Palabras clave que indican un SBOM
    sbom_keywords = [
        'package:', 'component:', 'dependency:', 'vulnerability:', 'license:',
        'spdx', 'cyclonedx', 'sbom', 'bill of materials',
        'cve-', 'npm:', 'maven:', 'pypi:', 'pkg:'
    ]
    
    found_keywords = [kw for kw in sbom_keywords if kw in content_lower]
    
    if len(found_keywords) >= 3:
        return True, f"Posible SBOM de texto detectado (palabras clave: {len(found_keywords)})"
    
    return False, "El archivo de texto no parece contener información de SBOM"

def verificar_limites_proyecto(proyecto_id, vulnerabilidades_encontradas):
    """Verifica si las vulnerabilidades encontradas exceden el límite del proyecto"""
    try:
        print(f"🔍 Consultando proyecto {proyecto_id} desde API...")
        
        # Construir URL y headers
        url = f"http://localhost:5001/proyectos/{proyecto_id}"
        headers = {}
        
        # Copiar cookies de la request actual
        cookies = {}
        if hasattr(request, 'cookies'):
            for name, value in request.cookies.items():
                cookies[name] = value
        
        print(f"📡 Haciendo request a: {url}")
        print(f"🍪 Cookies: {list(cookies.keys())}")
        print(f"📊 Proyecto ID: '{proyecto_id}' (tipo: {type(proyecto_id)})")
        
        response = requests.get(url, cookies=cookies, headers=headers, timeout=10)
        
        print(f"📤 Status code: {response.status_code}")
        print(f"📤 Response text preview: {response.text[:200]}...")
        
        if response.status_code == 200:
            proyecto_data = response.json()
            max_vulnerabilidades = proyecto_data.get('max_vulnerabilidades', 10)
            
            # ✅ VALIDAR QUE SEA UN NÚMERO VÁLIDO
            if max_vulnerabilidades is None:
                print(f"⚠️ max_vulnerabilidades es None, usando valor por defecto: 10")
                max_vulnerabilidades = 10
            
            try:
                max_vulnerabilidades = int(max_vulnerabilidades)
            except (ValueError, TypeError):
                print(f"⚠️ max_vulnerabilidades no es válido: {max_vulnerabilidades}, usando 10")
                max_vulnerabilidades = 10
            
            print(f"✅ Proyecto encontrado: límite = {max_vulnerabilidades}")
            print(f"✅ Datos completos del proyecto: {proyecto_data}")
            
            return {
                'excede_limite': vulnerabilidades_encontradas > max_vulnerabilidades,
                'limite_configurado': max_vulnerabilidades,
                'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
                'diferencia': vulnerabilidades_encontradas - max_vulnerabilidades,
                'proyecto_encontrado': True
            }
        elif response.status_code == 404:
            print(f"⚠️ Proyecto {proyecto_id} no encontrado (404)")
            return {
                'excede_limite': False,
                'limite_configurado': None,
                'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
                'diferencia': 0,
                'proyecto_encontrado': False,
                'error': 'Proyecto no encontrado'
            }
        elif response.status_code == 403:
            print(f"🚫 Sin permisos para acceder al proyecto {proyecto_id} (403)")
            return {
                'excede_limite': False,
                'limite_configurado': None,
                'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
                'diferencia': 0,
                'proyecto_encontrado': False,
                'error': 'Sin permisos para acceder al proyecto'
            }
        else:
            print(f"❌ Error HTTP {response.status_code}: {response.text}")
            return {
                'excede_limite': False,
                'limite_configurado': None,
                'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
                'diferencia': 0,
                'proyecto_encontrado': False,
                'error': f'Error HTTP {response.status_code}'
            }
            
    except requests.exceptions.Timeout:
        print(f"⏰ Timeout consultando proyecto {proyecto_id}")
        return {
            'excede_limite': False,
            'limite_configurado': None,
            'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
            'diferencia': 0,
            'proyecto_encontrado': False,
            'error': 'Timeout en consulta'
        }
    except requests.exceptions.ConnectionError:
        print(f"🔌 Error de conexión consultando proyecto {proyecto_id}")
        return {
            'excede_limite': False,
            'limite_configurado': None,
            'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
            'diferencia': 0,
            'proyecto_encontrado': False,
            'error': 'Error de conexión con API'
        }
    except Exception as e:
        print(f"❌ Error inesperado verificando límites del proyecto {proyecto_id}: {e}")
        import traceback
        traceback.print_exc()
        return {
            'excede_limite': False,
            'limite_configurado': None,
            'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
            'diferencia': 0,
            'proyecto_encontrado': False,
            'error': f'Error inesperado: {str(e)}'
        }

@app.route('/chat/upload-sbom', methods=['POST'])
def upload_sbom():
    """Endpoint para subir y procesar archivos SBOM con análisis NVD y verificación de límites"""
    try:
        print("🚀 Endpoint /chat/upload-sbom llamado")
        
        if 'file' not in request.files:
            return jsonify({"error": "No se ha enviado ningún archivo"}), 400
        
        file = request.files['file']
        mensaje = request.form.get('mensaje', 'Analiza este archivo SBOM con consulta a NVD')
        proyecto_id = request.form.get('proyecto_id', '')
        # ✅ OBTENER LÍMITE DIRECTAMENTE DEL FORMULARIO
        limite_vulnerabilidades = request.form.get('limite_vulnerabilidades', '10')
        
        try:
            limite_vulnerabilidades = int(limite_vulnerabilidades)
        except (ValueError, TypeError):
            limite_vulnerabilidades = 10
        
        print(f"📥 Archivo: {file.filename}, Proyecto: {proyecto_id}, Límite: {limite_vulnerabilidades}")
        
        if file.filename == '':
            return jsonify({"error": "No se ha seleccionado ningún archivo"}), 400
        
        if file and allowed_file(file.filename):
            # Guardar archivo de forma segura
            filename = secure_filename(file.filename)
            timestamp = str(int(time.time()))
            unique_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            
            file.save(file_path)
            print(f"📁 Archivo guardado: {file_path}")
            
            # Validar que sea un SBOM
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                es_sbom, mensaje_validacion = validar_contenido_sbom(content, filename)
                
                if not es_sbom:
                    try:
                        os.remove(file_path)
                    except:
                        pass
                    
                    return jsonify({
                        "error": f"El archivo no es un SBOM válido: {mensaje_validacion}",
                        "sugerencia": "Por favor, sube un archivo SBOM en formato CycloneDX, SPDX, o que contenga información de componentes de software."
                    }), 400
                
                print(f"✅ SBOM válido confirmado: {mensaje_validacion}")
                
            except Exception as e:
                try:
                    os.remove(file_path)
                except:
                    pass
                
                return jsonify({
                    "error": f"Error validando el archivo: {str(e)}",
                    "sugerencia": "Verifica que el archivo no esté corrupto y tenga el formato correcto."
                }), 400
            
            # Procesar el archivo SBOM
            sbom_data = procesar_archivo_sbom(file_path, filename)
            print(f"📊 SBOM procesado: {type(sbom_data)}")
            
            # ✅ ENRIQUECER CON DATOS DE NVD
            if isinstance(sbom_data, dict):
                print("🔍 Iniciando consulta a NVD...")
                sbom_data = asyncio.run(enriquecer_sbom_con_nvd(sbom_data))
                print("✅ Enriquecimiento NVD completado")
            
            # ✅ VERIFICAR LÍMITES SIN CONSULTAR API - USAR LÍMITE DEL FORMULARIO
            limites_check = None
            contexto_proyecto = ""

            if proyecto_id and isinstance(sbom_data, dict) and 'vulnerabilidades_nvd' in sbom_data:
                vulnerabilidades_nvd = sbom_data.get('vulnerabilidades_nvd', [])
                total_vulnerabilidades = len(vulnerabilidades_nvd)
                
                print(f"🔒 Verificando límites para proyecto {proyecto_id}: {total_vulnerabilidades} vulnerabilidades encontradas")
                print(f"🎯 Límite configurado: {limite_vulnerabilidades}")
                
                # ✅ CREAR LIMITES_CHECK MANUALMENTE SIN API
                limites_check = {
                    'excede_limite': total_vulnerabilidades > limite_vulnerabilidades,
                    'limite_configurado': limite_vulnerabilidades,
                    'vulnerabilidades_encontradas': total_vulnerabilidades,
                    'diferencia': total_vulnerabilidades - limite_vulnerabilidades,
                    'proyecto_encontrado': True
                }
                
                print(f"🔒 Límites calculados: {limites_check}")
                
                # ✅ GENERAR CONTEXTO ESPECÍFICO PARA LA IA
                contexto_proyecto = f"\n\n🎯 **CONFIGURACIÓN DEL PROYECTO:**\n"
                contexto_proyecto += f"- Límite máximo de vulnerabilidades configurado: **{limite_vulnerabilidades}**\n"
                contexto_proyecto += f"- Vulnerabilidades encontradas en el SBOM: **{total_vulnerabilidades}**\n"
                
                if limites_check['excede_limite']:
                    diferencia = limites_check['diferencia']
                    contexto_proyecto += f"- ⚠️ **ESTADO: LÍMITE EXCEDIDO** por {diferencia} vulnerabilidades\n"
                    contexto_proyecto += f"- 🚨 **ACCIÓN REQUERIDA**: El SBOM NO cumple con los estándares de seguridad del proyecto\n"
                    
                    # Categorizar nivel de exceso
                    if diferencia <= 5:
                        contexto_proyecto += f"- 📊 **Nivel de exceso**: MODERADO (+{diferencia})\n"
                    elif diferencia <= 15:
                        contexto_proyecto += f"- 📊 **Nivel de exceso**: ALTO (+{diferencia})\n"
                    else:
                        contexto_proyecto += f"- 📊 **Nivel de exceso**: CRÍTICO (+{diferencia})\n"
                else:
                    margen_restante = limite_vulnerabilidades - total_vulnerabilidades
                    contexto_proyecto += f"- ✅ **ESTADO: DENTRO DEL LÍMITE**\n"
                    contexto_proyecto += f"- 📊 **Margen disponible**: {margen_restante} vulnerabilidades adicionales\n"
                    
                    # Evaluar proximidad al límite
                    if limite_vulnerabilidades > 0:
                        porcentaje_usado = (total_vulnerabilidades / limite_vulnerabilidades) * 100
                        if porcentaje_usado >= 80:
                            contexto_proyecto += f"- ⚠️ **Advertencia**: Usando {porcentaje_usado:.1f}% del límite (muy cerca del máximo)\n"
                        elif porcentaje_usado >= 60:
                            contexto_proyecto += f"- 🔄 **Atención**: Usando {porcentaje_usado:.1f}% del límite (monitoreo recomendado)\n"
                        else:
                            contexto_proyecto += f"- 🟢 **Estado saludable**: Usando {porcentaje_usado:.1f}% del límite\n"
                
                # ✅ AÑADIR INFORMACIÓN SOBRE SEVERIDADES SI EXCEDE LÍMITE
                if limites_check['excede_limite'] and sbom_data.get('vulnerabilidades_nvd'):
                    severidades = {}
                    for vuln in sbom_data['vulnerabilidades_nvd']:
                        sev = vuln.get('severidad', 'UNKNOWN')
                        severidades[sev] = severidades.get(sev, 0) + 1
                    
                    contexto_proyecto += f"\n📈 **Distribución de severidades que causan el exceso:**\n"
                    for sev in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']:
                        if sev in severidades:
                            icono = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢', 'UNKNOWN': '⚪'}.get(sev, '⚪')
                            contexto_proyecto += f"• {icono} **{sev}**: {severidades[sev]} vulnerabilidades\n"
                
                # ✅ RECOMENDACIONES ESPECÍFICAS SEGÚN EL ESTADO
                contexto_proyecto += f"\n💡 **RECOMENDACIONES BASADAS EN LA CONFIGURACIÓN DEL PROYECTO:**\n"
                
                if limites_check['excede_limite']:
                    contexto_proyecto += f"• 🎯 **Objetivo**: Reducir {limites_check['diferencia']} vulnerabilidades para cumplir límite\n"
                    contexto_proyecto += f"• 🔧 Priorizar parches para vulnerabilidades CRITICAL y HIGH\n"
                    contexto_proyecto += f"• 📦 Actualizar dependencias con vulnerabilidades conocidas\n"
                    contexto_proyecto += f"• 🛡️ Implementar controles de mitigación temporales\n"
                    contexto_proyecto += f"• 📊 Considerar si el límite de {limite_vulnerabilidades} es apropiado para este proyecto\n"
                else:
                    contexto_proyecto += f"• ✅ El SBOM cumple con los estándares de seguridad configurados\n"
                    contexto_proyecto += f"• 🔍 Mantener monitoreo proactivo de nuevas vulnerabilidades\n"
                    contexto_proyecto += f"• 📈 Considerar reducir vulnerabilidades existentes para mejorar postura de seguridad\n"
                    if margen_restante <= 3:
                        contexto_proyecto += f"• ⚠️ Margen pequeño: establecer alertas para nuevas vulnerabilidades\n"

            # Obtener usuario y historial
            user_id = obtener_usuario_id(request)
            if user_id not in historial_conversaciones:
                historial_conversaciones[user_id] = []
            
            # ✅ GENERAR RESPUESTA CON GEMINI INCLUYENDO CONTEXTO DEL PROYECTO
            if model and isinstance(sbom_data, dict):
                try:
                    # ✅ PROMPT COMPLETO CON CONTEXTO DE LÍMITES
                    prompt_base = generar_prompt_sbom(sbom_data, mensaje)
                    prompt_completo = prompt_base + contexto_proyecto
                    
                    # ✅ INSTRUCCIONES ESPECÍFICAS PARA LA IA
                    instrucciones_ia = f"\n\n🤖 **INSTRUCCIONES PARA EL ANÁLISIS:**\n"

                    if limites_check and limites_check.get('proyecto_encontrado', False):
                        limite = limites_check['limite_configurado']
                        vulnerabilidades = limites_check['vulnerabilidades_encontradas']
                        
                        instrucciones_ia += f"1. **CONTEXTO DEL PROYECTO**: Este proyecto tiene configurado un límite máximo de **{limite}** vulnerabilidades\n"
                        instrucciones_ia += f"2. **ESTADO ACTUAL**: Se encontraron **{vulnerabilidades}** vulnerabilidades en el SBOM\n"
                        
                        if limites_check['excede_limite']:
                            diferencia = limites_check['diferencia']
                            instrucciones_ia += f"3. **🚨 SITUACIÓN CRÍTICA**: El proyecto EXCEDE el límite por **{diferencia}** vulnerabilidades\n"
                            instrucciones_ia += f"4. **PRIORIDAD ALTA**: Enfócate en las vulnerabilidades más críticas que DEBEN resolverse\n"
                            instrucciones_ia += f"5. **PLAN DE ACCIÓN**: Proporciona un plan específico para reducir a **{limite}** o menos vulnerabilidades\n"
                            instrucciones_ia += f"6. **RECOMENDACIONES**: Prioriza por severidad (CRITICAL > HIGH > MEDIUM > LOW)\n"
                            instrucciones_ia += f"7. **OBJETIVO**: Identificar las **{diferencia}** vulnerabilidades menos críticas que se pueden resolver más fácilmente\n"
                        else:
                            margen = limite - vulnerabilidades
                            porcentaje = round((vulnerabilidades / limite) * 100, 1) if limite > 0 else 0
                            instrucciones_ia += f"3. **✅ ESTADO CONFORME**: El proyecto CUMPLE con el límite establecido\n"
                            instrucciones_ia += f"4. **MARGEN DISPONIBLE**: {margen} vulnerabilidades adicionales permitidas\n"
                            instrucciones_ia += f"5. **USO DEL LÍMITE**: {porcentaje}% del límite utilizado\n"
                            instrucciones_ia += f"6. **RECOMENDACIONES**: Mantener vigilancia y considerar mejorar aún más la seguridad\n"
                            
                            if porcentaje >= 80:
                                instrucciones_ia += f"7. **⚠️ ADVERTENCIA**: Muy cerca del límite ({porcentaje}%), considerar reducir vulnerabilidades proactivamente\n"
                            elif porcentaje >= 60:
                                instrucciones_ia += f"7. **🔄 MONITOREO**: Uso moderado del límite, mantener seguimiento regular\n"
                            else:
                                instrucciones_ia += f"7. **🟢 ESTADO SALUDABLE**: Uso bajo del límite, excelente postura de seguridad\n"
                    else:
                        instrucciones_ia += f"1. **CONTEXTO**: No se pudo obtener la configuración específica del proyecto\n"
                        instrucciones_ia += f"2. **ANÁLISIS GENERAL**: Proporciona recomendaciones generales de seguridad\n"
                        instrucciones_ia += f"3. **EVALUACIÓN**: Analiza el nivel de riesgo basado en las vulnerabilidades encontradas\n"

                    instrucciones_ia += f"\n🎯 **FORMATO DE RESPUESTA REQUERIDO:**\n"
                    instrucciones_ia += f"• Inicia con un **RESUMEN EJECUTIVO** que mencione el cumplimiento/incumplimiento del límite\n"
                    instrucciones_ia += f"• Usa **negrita** para destacar el estado respecto al límite configurado\n"
                    instrucciones_ia += f"• Proporciona **recomendaciones específicas** priorizadas según la situación del proyecto\n"
                    instrucciones_ia += f"• Incluye una **evaluación de riesgo** considerando el contexto del límite del proyecto\n"
                    
                    prompt_final = prompt_completo + instrucciones_ia
                    
                    print(f"🧠 Enviando análisis SBOM con contexto de proyecto a Gemini...")
                    
                    response = model.generate_content(prompt_final)
                    response_text = response.text
                    
                except Exception as e:
                    print(f"❌ Error con Gemini: {e}")
                    
                    # ✅ RESPUESTA DE FALLBACK CON CONTEXTO DE LÍMITES
                    nvd_info = sbom_data.get('resumen', {}).get('nvd_analysis', {})
                    vulns_count = nvd_info.get('total_vulnerabilidades_nvd', 0)

                    response_text = f"He procesado tu archivo SBOM ({sbom_data.get('formato', 'formato desconocido')}) "
                    response_text += f"y consultado la National Vulnerability Database.\n\n"
                    response_text += f"📊 **Resultados del análisis:**\n"
                    response_text += f"• Vulnerabilidades encontradas: **{vulns_count}**\n"

                    # ✅ VERIFICAR QUE LIMITES_CHECK Y LIMITE_CONFIGURADO SEAN VÁLIDOS
                    if (limites_check and 
                        limites_check.get('proyecto_encontrado', False) and 
                        limites_check.get('limite_configurado') is not None):
                        
                        limite_configurado = limites_check['limite_configurado']
                        response_text += f"• Límite configurado para tu proyecto: **{limite_configurado}**\n"
                        
                        if limites_check['excede_limite']:
                            response_text += f"• ⚠️ **LÍMITE EXCEDIDO** por **{limites_check['diferencia']}** vulnerabilidades\n"
                            response_text += f"• 🎯 **Acción requerida**: Reducir vulnerabilidades para cumplir estándar del proyecto\n"
                        else:
                            margen = limite_configurado - vulns_count
                            response_text += f"• ✅ **DENTRO DEL LÍMITE** - Margen disponible: **{margen}**\n"
                            response_text += f"• 🟢 **Estado**: El SBOM cumple con los estándares de seguridad del proyecto\n"
                    else:
                        response_text += f"• ⚠️ No se pudo verificar límites del proyecto\n"

                    response_text += f"\n¿Qué aspecto específico del análisis te gustaría explorar?"
            else:
                # ✅ RESPUESTA BÁSICA CON CONTEXTO DE LÍMITES
                response_text = f"He recibido y procesado tu archivo SBOM con consulta a NVD.\n\n"
                if limites_check:
                    if limites_check['excede_limite']:
                        response_text += f"⚠️ **IMPORTANTE**: Se encontraron **{limites_check['vulnerabilidades_encontradas']}** vulnerabilidades, "
                        response_text += f"excediendo el límite de **{limites_check['limite_configurado']}** configurado para tu proyecto por **{limites_check['diferencia']}** vulnerabilidades.\n\n"
                        response_text += f"🎯 **Tu proyecto requiere acción** para cumplir con los estándares de seguridad establecidos.\n"
                    else:
                        response_text += f"✅ **EXCELENTE**: Se encontraron **{limites_check['vulnerabilidades_encontradas']}** vulnerabilidades, "
                        response_text += f"dentro del límite de **{limites_check['limite_configurado']}** configurado para tu proyecto.\n\n"
                        response_text += f"🟢 **Tu proyecto cumple** con los estándares de seguridad establecidos.\n"
                
                response_text += f"\n¿En qué puedo ayudarte con este análisis de seguridad?"
            
            # Guardar en historial
            historial_usuario = historial_conversaciones[user_id]
            historial_usuario.append(f"Usuario subió SBOM: {filename} - {mensaje}")
            historial_usuario.append(f"Bot: {response_text}")
            
            # Limpiar archivo temporal
            try:
                os.remove(file_path)
            except:
                pass
            
            # Preparar información del SBOM para la respuesta
            sbom_info = {
                "filename": filename,
                "formato": sbom_data.get('formato', 'Desconocido') if isinstance(sbom_data, dict) else 'Error',
                "componentes": sbom_data.get('resumen', {}).get('total_componentes', 0) if isinstance(sbom_data, dict) else 0,
                "validacion": mensaje_validacion
            }
            
            # ✅ AÑADIR INFORMACIÓN DE NVD Y LÍMITES
            if isinstance(sbom_data, dict) and 'vulnerabilidades_nvd' in sbom_data:
                nvd_analysis = sbom_data.get('resumen', {}).get('nvd_analysis', {})
                sbom_info['nvd_analysis'] = {
                    'vulnerabilidades_encontradas': len(sbom_data['vulnerabilidades_nvd']),
                    'componentes_analizados': nvd_analysis.get('componentes_analizados', 0),
                    'componentes_vulnerables': nvd_analysis.get('componentes_con_vulnerabilidades', 0)
                }
                
                # ✅ AÑADIR INFORMACIÓN DE LÍMITES DEL PROYECTO
                if limites_check:
                    sbom_info['limites_proyecto'] = {
                        'limite_configurado': limites_check['limite_configurado'],
                        'vulnerabilidades_encontradas': limites_check['vulnerabilidades_encontradas'],
                        'excede_limite': limites_check['excede_limite'],
                        'diferencia': limites_check['diferencia'],
                        'estado': 'CRÍTICO' if limites_check['excede_limite'] else 'ACEPTABLE'
                    }
            
            return jsonify({
                "message": response_text,
                "sbom_info": sbom_info,
                "file_processed": True,
                # ✅ INFORMACIÓN ADICIONAL PARA EL FRONTEND
                "security_alert": limites_check['excede_limite'] if (limites_check and limites_check.get('proyecto_encontrado', False)) else False,
                "proyecto_id": proyecto_id,
                # ✅ NUEVO: Información detallada de límites para el frontend
                "limites_info": {
                    "limite_configurado": limites_check['limite_configurado'] if (limites_check and limites_check.get('proyecto_encontrado', False) and limites_check.get('limite_configurado') is not None) else None,
                    "vulnerabilidades_encontradas": limites_check['vulnerabilidades_encontradas'] if limites_check else 0,
                    "excede_limite": limites_check['excede_limite'] if (limites_check and limites_check.get('proyecto_encontrado', False)) else False,
                    "diferencia": limites_check['diferencia'] if (limites_check and limites_check.get('proyecto_encontrado', False)) else 0,
                    "margen_disponible": (limites_check['limite_configurado'] - limites_check['vulnerabilidades_encontradas']) if (limites_check and limites_check.get('proyecto_encontrado', False) and not limites_check['excede_limite'] and limites_check.get('limite_configurado') is not None) else 0,
                    "porcentaje_usado": round((limites_check['vulnerabilidades_encontradas'] / limites_check['limite_configurado']) * 100, 1) if (limites_check and limites_check.get('proyecto_encontrado', False) and limites_check.get('limite_configurado', 0) > 0) else 0
                } if limites_check else None
            }), 200
            
        else:
            return jsonify({"error": "Tipo de archivo no permitido. Formatos soportados: JSON, XML, YAML, SPDX, TXT"}), 400
            
    except Exception as e:
        print(f"❌ Error en upload_sbom: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

@app.route('/debug/proyecto/<proyecto_id>', methods=['GET'])
def debug_proyecto(proyecto_id):
    """Endpoint temporal para debug de configuración de proyecto"""
    try:
        print(f"🔍 DEBUG: Proyecto ID recibido: {proyecto_id}")
        print(f"🍪 DEBUG: Cookies en request: {dict(request.cookies)}")
        
        limites_info = verificar_limites_proyecto(proyecto_id, 0)
        
        return jsonify({
            "proyecto_id": proyecto_id,
            "limites_info": limites_info,
            "cookies_disponibles": dict(request.cookies),
            "headers": dict(request.headers)
        })
    except Exception as e:
        print(f"❌ Error en debug: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "proyecto_id": proyecto_id
        }), 500

@app.route('/chat/mensajes', methods=['POST'])
def chat_mensajes():
    try:
        data = request.json
        mensaje = data.get('message', '')
        proyecto_id = data.get('proyecto_id', '')  # ✅ Obtener ID del proyecto
        proyecto_nombre = data.get('proyecto_nombre', '')  # ✅ Obtener nombre del proyecto
        
        if not mensaje:
            return jsonify({"error": "Mensaje vacío"}), 400
        
        user_id = obtener_usuario_id(request)
        
        # ✅ OBTENER CONTEXTO DEL PROYECTO SI ESTÁ DISPONIBLE
        contexto_proyecto = ""
        if proyecto_id:
            try:
                proyecto_info = verificar_limites_proyecto(proyecto_id, 0)  # 0 vulnerabilidades para obtener solo info del proyecto
                
                # ✅ VERIFICAR QUE SE ENCONTRÓ EL PROYECTO
                if proyecto_info.get('proyecto_encontrado', False) and proyecto_info.get('limite_configurado') is not None:
                    contexto_proyecto = f"\n\n🎯 **CONTEXTO DEL PROYECTO ACTUAL:**\n"
                    contexto_proyecto += f"- Proyecto: **{proyecto_nombre}**\n"
                    contexto_proyecto += f"- Límite máximo de vulnerabilidades: **{proyecto_info['limite_configurado']}**\n"
                    contexto_proyecto += f"- Configuración de seguridad: {'Alta' if proyecto_info['limite_configurado'] <= 5 else 'Estándar' if proyecto_info['limite_configurado'] <= 15 else 'Permisiva'}\n"
                    contexto_proyecto += f"\n💡 **Cuando analices vulnerabilidades o SBOM, considera este límite como referencia para tus recomendaciones.**\n"
                else:
                    error_msg = proyecto_info.get('error', 'Error desconocido')
                    print(f"⚠️ No se pudo obtener contexto del proyecto {proyecto_id}: {error_msg}")
                    contexto_proyecto = f"\n\n⚠️ **Nota:** No se pudo obtener la configuración específica del proyecto ({error_msg})\n"
                    
            except Exception as e:
                print(f"⚠️ Error obteniendo contexto del proyecto: {e}")
                contexto_proyecto = f"\n\n⚠️ **Nota:** Error obteniendo configuración del proyecto\n"
        
        # Inicializar historial si no existe
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = []
        
        historial_usuario = historial_conversaciones[user_id]
        
        if model:
            try:
                # ✅ GENERAR CONTEXTO COMPLETO INCLUYENDO PROYECTO
                contexto_previo = formatear_historial_para_ai(historial_usuario)
                prompt_completo = contexto_previo + contexto_proyecto + f"\n\nUsuario: {mensaje}"
                
                print(f"🧠 Enviando mensaje con contexto de proyecto a Gemini...")
                
                response = model.generate_content(prompt_completo)
                response_text = response.text
                
            except Exception as e:
                print(f"❌ Error con Gemini: {e}")
                response_text = "Lo siento, hubo un error procesando tu mensaje. ¿Podrías reformular tu pregunta?"
        else:
            response_text = "Servidor de AI temporalmente no disponible. Por favor, intenta más tarde."
        
        # Guardar en historial
        historial_usuario.append(f"Usuario: {mensaje}")
        historial_usuario.append(f"Bot: {response_text}")
        
        # Mantener solo los últimos 20 intercambios
        if len(historial_usuario) > 40:
            historial_usuario = historial_usuario[-40:]
        
        historial_conversaciones[user_id] = historial_usuario
        
        return jsonify({"message": response_text}), 200
        
    except Exception as e:
        print(f"❌ Error en chat_mensajes: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

# ✅ ENDPOINT DE HEALTH CHECK
@app.route('/health', methods=['GET'])
def health_check():
    try:
        total_usuarios = len(historial_conversaciones)
        total_mensajes = sum(len(hist) for hist in historial_conversaciones.values())
        
        return jsonify({
            "status": "ok",
            "service": "chat",
            "port": 5002,
            "ai_available": model is not None,
            "cors_configured": True,
            "memoria_activa": True,
            "usuarios_activos": total_usuarios,
            "total_mensajes": total_mensajes,
            "sbom_processing": True,
            "formatos_soportados": list(ALLOWED_EXTENSIONS)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "Servidor de Chat SVAIA - Con Memoria y Procesamiento SBOM",
        "endpoints": ["/chat/mensajes", "/chat/upload-sbom", "/health"],
        "status": "running",
        "version": "5.0",
        "features": ["memoria_conversacion", "contexto_ai", "historial_persistente", "procesamiento_sbom"],
        "formatos_sbom": ["CycloneDX (JSON/XML)", "SPDX (JSON/XML)", "YAML", "Texto plano"]
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5002, debug=True)