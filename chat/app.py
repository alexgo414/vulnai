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
import aiohttp

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

def formatear_historial_para_ai(historial, es_pregunta_sbom=False, mensaje_usuario=""):
    """Convierte el historial en un formato optimizado según el tipo de pregunta"""
    if not historial:
        return "No hay conversación previa.\n"
    
    contexto = "Contexto de la conversación:\n"
    sbom_context = None
    conversacion_normal = []
    
    # ✅ SEPARAR CONTEXTO SBOM DE CONVERSACIÓN NORMAL
    for entrada in historial:
        if entrada.startswith("CONTEXTO_SBOM:"):
            try:
                sbom_data_str = entrada.replace("CONTEXTO_SBOM: ", "")
                sbom_context = json.loads(sbom_data_str)
                print(f"✅ Contexto SBOM encontrado: {sbom_context['filename']}")
            except Exception as e:
                print(f"⚠️ Error parseando contexto SBOM: {e}")
        else:
            conversacion_normal.append(entrada)
    
    # ✅ LÓGICA OPTIMIZADA: CONTEXTO MÍNIMO PARA PREGUNTAS SIMPLES
    if not es_pregunta_sbom and sbom_context:
        # Para preguntas no relacionadas con SBOM, solo incluir resumen básico
        contexto += f"\n🔍 **CONTEXTO REDUCIDO DEL ÚLTIMO ANÁLISIS SBOM:**\n"
        contexto += f"- **Archivo:** {sbom_context['filename']}\n"
        contexto += f"- **Formato:** {sbom_context['sbom_data'].get('formato', 'Desconocido')}\n"
        contexto += f"- **Componentes totales:** {sbom_context['sbom_data'].get('resumen', {}).get('total_componentes', 0)}\n"
        contexto += f"- **Vulnerabilidades encontradas:** {sbom_context['resumen_vulnerabilidades']['total']}\n"
        
        # Solo distribución por severidad, no lista completa
        if sbom_context['resumen_vulnerabilidades']['por_severidad']:
            contexto += f"- **Distribución por severidad:**\n"
            for sev, count in sbom_context['resumen_vulnerabilidades']['por_severidad'].items():
                emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢', 'UNKNOWN': '⚪'}.get(sev, '⚪')
                contexto += f"  {emoji} {sev}: {count}\n"
        
        contexto += f"- **Fecha de análisis:** {sbom_context['timestamp']}\n\n"
        contexto += "**📋 NOTA:** Tienes disponible un análisis SBOM completo. Si el usuario pregunta específicamente sobre vulnerabilidades, menciona que puedes proporcionar detalles específicos.\n\n"
        
    elif es_pregunta_sbom and sbom_context:
        # Para preguntas sobre SBOM, incluir contexto completo
        contexto += f"\n🔍 **CONTEXTO COMPLETO DEL ÚLTIMO ANÁLISIS SBOM:**\n"
        contexto += f"- **Archivo:** {sbom_context['filename']}\n"
        contexto += f"- **Formato:** {sbom_context['sbom_data'].get('formato', 'Desconocido')}\n"
        contexto += f"- **Componentes totales:** {sbom_context['sbom_data'].get('resumen', {}).get('total_componentes', 0)}\n"
        contexto += f"- **Vulnerabilidades encontradas:** {sbom_context['resumen_vulnerabilidades']['total']}\n"
        
        # ✅ INCLUIR LISTA COMPLETA SOLO SI ES NECESARIO
        vulnerabilidades_nvd = sbom_context['sbom_data'].get('vulnerabilidades_nvd', [])
        if vulnerabilidades_nvd:
            # Limitar vulnerabilidades mostradas para evitar contexto excesivo
            max_vulns_mostrar = 20  # Solo mostrar las primeras 20
            contexto += f"\n**📋 VULNERABILIDADES PRINCIPALES (mostrando {min(len(vulnerabilidades_nvd), max_vulns_mostrar)} de {len(vulnerabilidades_nvd)}):**\n"
            
            for i, vuln in enumerate(vulnerabilidades_nvd[:max_vulns_mostrar], 1):
                cve_id = vuln.get('cve_id', 'N/A')
                severidad = vuln.get('severidad', 'UNKNOWN')
                score = vuln.get('score_cvss', 0)
                comp = vuln.get('componente_afectado', {})
                comp_nombre = comp.get('nombre', 'Unknown')
                
                contexto += f"**{i}. {cve_id}** - Severidad: {severidad} (Score: {score}) - Componente: {comp_nombre}\n"
            
            if len(vulnerabilidades_nvd) > max_vulns_mostrar:
                contexto += f"\n**... y {len(vulnerabilidades_nvd) - max_vulns_mostrar} vulnerabilidades adicionales disponibles para consulta específica.**\n"
        
        # Incluir criterios y proyecto info
        if sbom_context.get('proyecto_nombre'):
            contexto += f"- **Proyecto analizado:** {sbom_context['proyecto_nombre']}\n"
        
        if sbom_context.get('criterios_solucionabilidad'):
            criterios = sbom_context['criterios_solucionabilidad']
            contexto += f"- **Criterios aplicados:** Severidad {criterios.get('peso_severidad', 70)}% / Solucionabilidad {criterios.get('peso_solucionabilidad', 30)}%\n"
    
    # ✅ INCLUIR CONVERSACIÓN NORMAL (últimos 10 intercambios para preguntas simples, 15 para SBOM)
    limite_conversacion = 15 if es_pregunta_sbom else 10
    contexto += "**CONVERSACIÓN RECIENTE:**\n"
    for entrada in conversacion_normal[-limite_conversacion:]:
        contexto += f"{entrada}\n"
    
    contexto += "\n**INSTRUCCIONES:**\n"
    if es_pregunta_sbom:
        contexto += "- El usuario está preguntando sobre el SBOM. Usa la información específica proporcionada.\n"
        contexto += "- Si necesitas detalles de vulnerabilidades no mostradas, menciona que puedes proporcionarlos.\n"
    else:
        contexto += "- Esta es una consulta general. Responde de forma natural y concisa.\n"
        contexto += "- Si el usuario pregunta sobre vulnerabilidades, puedes mencionar que hay un análisis SBOM disponible.\n"
    
    return contexto

def es_pregunta_relacionada_sbom(mensaje):
    """Detecta si una pregunta está relacionada con SBOM con mayor precisión"""
    palabras_sbom_directas = [
        'vulnerabilidad', 'vulnerabilidades', 'cve', 'componente', 'componentes', 
        'sbom', 'análisis', 'analisis', 'severidad', 'parche', 'parches', 'exploit', 
        'solucionabilidad', 'prioridad', 'crítico', 'critico', 'alto', 'medio', 'bajo', 
        'seguridad', 'fácil', 'facil', 'difícil', 'dificil', 'lista', 'ejemplos', 
        'detalles', 'específico', 'especifico', 'cuáles', 'cuales', 'cuantas', 'cuántas'
    ]
    
    # Frases que claramente NO son sobre SBOM
    frases_no_sbom = [
        'hola', 'hello', 'buenos dias', 'buenas tardes', 'como estas', 'cómo estás',
        'gracias', 'de nada', 'perfecto', 'bien', 'mal', 'ok', 'vale', 'si', 'sí', 'no'
    ]
    
    mensaje_lower = mensaje.lower().strip()
    
    # Si es una frase de saludo/cortesía, definitivamente no es sobre SBOM
    if any(frase in mensaje_lower for frase in frases_no_sbom) and len(mensaje_lower) < 20:
        return False
    
    # Si contiene palabras relacionadas con SBOM, sí es sobre SBOM
    return any(palabra in mensaje_lower for palabra in palabras_sbom_directas)

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
        print(f"📋 Usando cache para {cache_key}")
        return nvd_cache[cache_key]
    
    vulnerabilidades = []
    
    try:
        # Normalizar nombre para búsqueda
        keyword = normalizar_nombre_componente(nombre)
        
        # ✅ NUEVA URL DE LA API V2.0
        url = f"{NVD_API_BASE_URL}?keywordSearch={keyword}"
        
        headers = {}
        if NVD_API_KEY:
            headers['apiKey'] = NVD_API_KEY
        
        print(f"🔍 Consultando NVD para: {keyword}")
        
        for intento in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=headers, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            # ✅ NUEVA ESTRUCTURA DE RESPUESTA
                            if 'vulnerabilities' in data:
                                print(f"📊 Encontradas {len(data['vulnerabilities'])} vulnerabilidades potenciales")
                                
                                for vuln_item in data['vulnerabilities']:
                                    # ✅ ACCEDER AL OBJETO CVE DENTRO DE VULNERABILITIES
                                    cve_data = vuln_item.get('cve', {})
                                    
                                    if es_vulnerabilidad_relevante(cve_data, componente):
                                        vulnerabilidad = {
                                            'cve_id': cve_data.get('id', 'CVE-UNKNOWN'),
                                            'descripcion': extraer_descripcion_cve(cve_data),
                                            'severidad': extraer_severidad_cve(cve_data),
                                            'score_cvss': extraer_score_cvss(cve_data),
                                            'vector_cvss': extraer_vector_cvss(cve_data),
                                            'fecha_publicacion': extraer_fecha_publicacion(cve_data),
                                            'referencias': extraer_referencias_cve(cve_data),
                                            'productos_afectados': extraer_productos_afectados(cve_data),
                                            'componente_afectado': {
                                                'nombre': nombre,
                                                'version': version
                                            },
                                            'cvss': cve_data.get('metrics', {})  # ✅ NUEVA ESTRUCTURA PARA MÉTRICAS
                                        }
                                        vulnerabilidades.append(vulnerabilidad)
                            
                            break  # Éxito, salir del bucle de reintentos
                            
                        elif response.status == 429:  # Rate limit
                            wait_time = 2 ** intento
                            print(f"⏳ Rate limit alcanzado, esperando {wait_time}s...")
                            await asyncio.sleep(wait_time)
                        else:
                            print(f"❌ Error en NVD API: {response.status}")
                            break
                            
            except asyncio.TimeoutError:
                print(f"⏰ Timeout en intento {intento + 1}")
                if intento < max_retries - 1:
                    await asyncio.sleep(1)
        
        # Guardar en cache
        nvd_cache[cache_key] = vulnerabilidades
        cache_expiry[cache_key] = datetime.now() + timedelta(hours=24)
        
        print(f"✅ Encontradas {len(vulnerabilidades)} vulnerabilidades relevantes para {nombre}")
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
    """Extrae descripción del CVE con nueva estructura"""
    try:
        # ✅ NUEVA ESTRUCTURA: descriptions es un array
        descriptions = cve_data.get('descriptions', [])
        for desc in descriptions:
            if desc.get('lang') == 'en':
                return desc.get('value', 'Sin descripción disponible')
        
        # Fallback: tomar la primera descripción disponible
        if descriptions:
            return descriptions[0].get('value', 'Sin descripción disponible')
            
        return 'Sin descripción disponible'
    except:
        return 'Sin descripción disponible'

def extraer_severidad_cve(cve_data):
    """Extrae severidad del CVE con nueva estructura"""
    try:
        # ✅ NUEVA ESTRUCTURA: metrics contiene las métricas CVSS
        metrics = cve_data.get('metrics', {})
        
        # Intentar CVSS v3.1 primero
        cvss_v31 = metrics.get('cvssMetricV31', [])
        if cvss_v31:
            base_severity = cvss_v31[0].get('cvssData', {}).get('baseSeverity', 'UNKNOWN')
            if base_severity != 'UNKNOWN':
                return base_severity.upper()
        
        # Intentar CVSS v3.0
        cvss_v30 = metrics.get('cvssMetricV30', [])
        if cvss_v30:
            base_severity = cvss_v30[0].get('cvssData', {}).get('baseSeverity', 'UNKNOWN')
            if base_severity != 'UNKNOWN':
                return base_severity.upper()
        
        # Intentar CVSS v2 como fallback
        cvss_v2 = metrics.get('cvssMetricV2', [])
        if cvss_v2:
            base_score = cvss_v2[0].get('cvssData', {}).get('baseScore', 0)
            if base_score >= 7.0:
                return 'HIGH'
            elif base_score >= 4.0:
                return 'MEDIUM'
            elif base_score > 0:
                return 'LOW'
        
        return 'UNKNOWN'
    except:
        return 'UNKNOWN'

def extraer_score_cvss(cve_data):
    """Extrae score CVSS del CVE con nueva estructura"""
    try:
        metrics = cve_data.get('metrics', {})
        
        # Intentar CVSS v3.1 primero
        cvss_v31 = metrics.get('cvssMetricV31', [])
        if cvss_v31:
            base_score = cvss_v31[0].get('cvssData', {}).get('baseScore')
            if base_score is not None:
                return float(base_score)
        
        # Intentar CVSS v3.0
        cvss_v30 = metrics.get('cvssMetricV30', [])
        if cvss_v30:
            base_score = cvss_v30[0].get('cvssData', {}).get('baseScore')
            if base_score is not None:
                return float(base_score)
        
        # Intentar CVSS v2 como fallback
        cvss_v2 = metrics.get('cvssMetricV2', [])
        if cvss_v2:
            base_score = cvss_v2[0].get('cvssData', {}).get('baseScore')
            if base_score is not None:
                return float(base_score)
        
        return 0.0
    except:
        return 0.0

def extraer_vector_cvss(cve_data):
    """Extrae vector CVSS del CVE con nueva estructura"""
    try:
        metrics = cve_data.get('metrics', {})
        
        # Intentar CVSS v3.1 primero
        cvss_v31 = metrics.get('cvssMetricV31', [])
        if cvss_v31:
            vector = cvss_v31[0].get('cvssData', {}).get('vectorString')
            if vector:
                return vector
        
        # Intentar CVSS v3.0
        cvss_v30 = metrics.get('cvssMetricV30', [])
        if cvss_v30:
            vector = cvss_v30[0].get('cvssData', {}).get('vectorString')
            if vector:
                return vector
        
        # Intentar CVSS v2 como fallback
        cvss_v2 = metrics.get('cvssMetricV2', [])
        if cvss_v2:
            vector = cvss_v2[0].get('cvssData', {}).get('vectorString')
            if vector:
                return vector
        
        return 'No disponible'
    except:
        return 'No disponible'

def extraer_fecha_publicacion(cve_data):
    """Extrae fecha de publicación del CVE con nueva estructura"""
    try:
        published = cve_data.get('published')
        if published:
            return published
        
        # Fallback
        return cve_data.get('datePublic', 'No disponible')
    except:
        return 'No disponible'

def extraer_referencias_cve(cve_data):
    """Extrae referencias del CVE con nueva estructura"""
    try:
        references = cve_data.get('references', [])
        return [ref.get('url', '') for ref in references[:5]]  # Máximo 5 referencias
    except:
        return []

def extraer_productos_afectados(cve_data):
    """Extrae productos afectados del CVE con nueva estructura"""
    try:
        # ✅ NUEVA ESTRUCTURA: configurations contiene información de productos
        configurations = cve_data.get('configurations', [])
        productos = []
        
        for config in configurations:
            nodes = config.get('nodes', [])
            for node in nodes:
                cpe_matches = node.get('cpeMatch', [])
                for cpe in cpe_matches[:3]:  # Máximo 3 por nodo
                    cpe_name = cpe.get('criteria', '')
                    if cpe_name:
                        productos.append(cpe_name)
        
        return productos[:10]  # Máximo 10 productos
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

async def enriquecer_sbom_con_nvd(sbom_data, limite_vulnerabilidades=10, max_severidad_permitida='MEDIUM'):
    """Enriquece el SBOM con vulnerabilidades de NVD aplicando filtros del proyecto"""
    if not isinstance(sbom_data, dict) or 'componentes' not in sbom_data:
        print("⚠️ SBOM data no válido para enriquecimiento NVD")
        return sbom_data
    
    print(f"🔍 Enriqueciendo SBOM con datos de NVD...")
    print(f"🎯 Filtros aplicados: umbral_seguridad={limite_vulnerabilidades}, max_severidad={max_severidad_permitida}")
    
    vulnerabilidades_nvd = []
    vulnerabilidades_excluidas = []
    componentes_analizados = 0
    componentes_con_vulns = 0
    
    # ✅ CONTADORES CORRECTOS
    total_vulnerabilidades_brutas = 0  # ✅ CONTADOR GLOBAL
    
    # ✅ MAPEO DE SEVERIDADES PARA FILTRADO
    severidad_niveles = {
        'LOW': 1,
        'MEDIUM': 2, 
        'HIGH': 3,
        'CRITICAL': 4
    }
    
    max_nivel_permitido = severidad_niveles.get(max_severidad_permitida, 2)
    print(f"🔍 Nivel máximo de severidad permitido: {max_severidad_permitida} (nivel {max_nivel_permitido})")

    # Analizar solo los primeros X componentes para evitar timeouts
    componentes_a_analizar = sbom_data['componentes'][:15]
    
    for componente in componentes_a_analizar:
        componentes_analizados += 1
        print(f"🔍 Analizando componente {componentes_analizados}/15: {componente.get('nombre', 'Unknown')}")
        
        try:
            vulns_componente = await buscar_vulnerabilidades_nvd(componente)
            
            if vulns_componente:
                # ✅ CONTAR TODAS LAS VULNERABILIDADES BRUTAS
                total_vulnerabilidades_brutas += len(vulns_componente)
                print(f"   📊 Encontradas {len(vulns_componente)} vulnerabilidades brutas")
                
                # ✅ APLICAR SOLO FILTRO DE SEVERIDAD (NO LÍMITE DE CANTIDAD)
                vulns_filtradas = []
                vulns_excluidas_componente = []
                
                for vuln in vulns_componente:
                    severidad_vuln = vuln.get('severidad', 'UNKNOWN')
                    nivel_vuln = severidad_niveles.get(severidad_vuln, 0)
                    
                    # ✅ FILTRAR SOLO POR SEVERIDAD MÁXIMA PERMITIDA
                    if nivel_vuln <= max_nivel_permitido:
                        vulns_filtradas.append(vuln)
                    else:
                        vuln['razon_exclusion'] = f"Severidad {severidad_vuln} excede el máximo permitido ({max_severidad_permitida})"
                        vulns_excluidas_componente.append(vuln)
                
                print(f"   ✅ Después del filtro de severidad: {len(vulns_filtradas)} vulnerabilidades válidas")
                print(f"   ❌ Excluidas por severidad: {len(vulns_excluidas_componente)} vulnerabilidades")
                
                if vulns_filtradas:
                    componentes_con_vulns += 1
                    vulnerabilidades_nvd.extend(vulns_filtradas)
                    
                # ✅ SIEMPRE AÑADIR LAS EXCLUIDAS AL TOTAL
                vulnerabilidades_excluidas.extend(vulns_excluidas_componente)
                    
            else:
                print(f"   ✅ Sin vulnerabilidades conocidas en NVD")
                
        except Exception as e:
            print(f"   ❌ Error consultando NVD: {e}")
            continue
    
    # ✅ NO APLICAR LÍMITE DE CANTIDAD - MOSTRAR TODAS LAS VULNERABILIDADES QUE PASAN EL FILTRO DE SEVERIDAD
    # El "límite" solo se usa para evaluar si el proyecto es seguro o no
    
    # Añadir vulnerabilidades de NVD al resultado
    sbom_data['vulnerabilidades_nvd'] = vulnerabilidades_nvd
    sbom_data['vulnerabilidades_excluidas'] = vulnerabilidades_excluidas
    
    # ✅ ACTUALIZAR RESUMEN CON CONTADORES CORRECTOS
    if 'resumen' not in sbom_data:
        sbom_data['resumen'] = {}
    
    # ✅ CALCULAR SEVERIDADES ENCONTRADAS (SOLO DE LAS INCLUIDAS)
    severidades_encontradas = []
    severidades_count = {}
    
    for vuln in vulnerabilidades_nvd:
        sev = vuln.get('severidad', 'UNKNOWN')
        severidades_encontradas.append(sev)
        severidades_count[sev] = severidades_count.get(sev, 0) + 1
    
    # ✅ CALCULAR ESTADÍSTICAS DE EXCLUSIÓN
    severidades_excluidas_count = {}
    for vuln in vulnerabilidades_excluidas:
        sev = vuln.get('severidad', 'UNKNOWN')
        severidades_excluidas_count[sev] = severidades_excluidas_count.get(sev, 0) + 1
    
    # ✅ RESUMEN CON CÁLCULOS CORRECTOS
    sbom_data['resumen']['nvd_analysis'] = {
        'componentes_analizados': componentes_analizados,
        'componentes_vulnerables': componentes_con_vulns,
        'vulnerabilidades_encontradas': len(vulnerabilidades_nvd),  # ✅ TODAS LAS QUE PASAN FILTRO DE SEVERIDAD
        'total_vulnerabilidades_nvd': len(vulnerabilidades_nvd),    # ✅ MANTENER COMPATIBILIDAD
        'severidades_encontradas': list(set(severidades_encontradas)),
        'severidades_count': severidades_count,
        
        # ✅ CÁLCULOS CORREGIDOS
        'total_vulnerabilidades_brutas': total_vulnerabilidades_brutas,  # ✅ TOTAL REAL
        'vulnerabilidades_excluidas': len(vulnerabilidades_excluidas),   # ✅ SOLO EXCLUIDAS POR SEVERIDAD
        'severidades_excluidas_count': severidades_excluidas_count,
        'filtros_aplicados': {
            'umbral_seguridad': limite_vulnerabilidades,  # ✅ CAMBIAR NOMBRE PARA CLARIDAD
            'max_severidad_permitida': max_severidad_permitida,
            'max_nivel_permitido': max_nivel_permitido
        }
    }
    
    print(f"✅ Análisis NVD completado:")
    print(f"   - Componentes analizados: {componentes_analizados}")
    print(f"   - Componentes con vulnerabilidades: {componentes_con_vulns}")
    print(f"   - Vulnerabilidades que pasan filtro de severidad: {len(vulnerabilidades_nvd)}")
    print(f"   - Vulnerabilidades excluidas por severidad: {len(vulnerabilidades_excluidas)}")
    print(f"   - Total vulnerabilidades brutas: {total_vulnerabilidades_brutas}")
    
    # ✅ EVALUACIÓN DE SEGURIDAD DEL PROYECTO
    es_proyecto_seguro = len(vulnerabilidades_nvd) <= limite_vulnerabilidades
    print(f"   - 🎯 Evaluación de seguridad: {'✅ SEGURO' if es_proyecto_seguro else '⚠️ RIESGO'} ({len(vulnerabilidades_nvd)} vs umbral {limite_vulnerabilidades})")
    
    # ✅ VERIFICACIÓN DE SANIDAD
    total_procesadas = len(vulnerabilidades_nvd) + len(vulnerabilidades_excluidas)
    print(f"   - Verificación: {len(vulnerabilidades_nvd)} + {len(vulnerabilidades_excluidas)} = {total_procesadas} (debería ser = {total_vulnerabilidades_brutas})")
    
    return sbom_data

def generar_prompt_sbom(sbom_data, mensaje_usuario, criterios_proyecto=None):
    """
    Genera un prompt específico para análisis de SBOM con datos de NVD
    Usa criterios personalizados si están disponibles
    """
    
    # ✅ SI HAY CRITERIOS DEL PROYECTO, USAR LA FUNCIÓN PERSONALIZADA
    if criterios_proyecto:
        return generar_prompt_sbom_con_criterios(sbom_data, mensaje_usuario, criterios_proyecto)
    
    # ✅ CÓDIGO ORIGINAL PARA CUANDO NO HAY CRITERIOS ESPECÍFICOS
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
        
        # ✅ MOSTRAR MÁS VULNERABILIDADES (era 5, ahora 15)
        vulns_criticas = sorted(vulnerabilidades_nvd, 
                               key=lambda x: x.get('score_cvss', 0), 
                               reverse=True)[:15]  # ✅ AUMENTADO A 15
        
        if vulns_criticas:
            prompt_parts.append("")
            prompt_parts.append("VULNERABILIDADES MÁS CRÍTICAS:")
            for i, vuln in enumerate(vulns_criticas, 1):
                comp = vuln.get('componente_afectado', {})
                prompt_parts.append(f"{i}. **{vuln.get('cve_id', 'CVE-Unknown')}** en *{comp.get('nombre', 'Unknown')}* {comp.get('version', '')}")
                prompt_parts.append(f"   - Severidad: **{vuln.get('severidad', 'UNKNOWN')}** (Score CVSS: {vuln.get('score_cvss', 0)})")
                prompt_parts.append(f"   - Descripción: {vuln.get('descripcion', 'Sin descripción')[:150]}...")
                prompt_parts.append("")  # Línea en blanco para separar
        
        # ✅ AÑADIR RESUMEN ADICIONAL SI HAY MUCHAS VULNERABILIDADES
        if len(vulnerabilidades_nvd) > 15:
            prompt_parts.append(f"**NOTA IMPORTANTE:** Se han encontrado {len(vulnerabilidades_nvd)} vulnerabilidades en total.")
            prompt_parts.append(f"Las {len(vulns_criticas)} vulnerabilidades mostradas arriba son las de mayor score CVSS.")
            prompt_parts.append("En tu análisis, menciona que hay vulnerabilidades adicionales y recomienda revisar el reporte completo.")
            prompt_parts.append("")
        
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

def generar_prompt_sbom_con_criterios(sbom_data, mensaje_usuario, criterios_proyecto):
    """
    Genera prompt incluyendo los criterios de solucionabilidad del proyecto específico
    """
    
    prompt_parts = []
    
    # ✅ CONTEXTO DE CRITERIOS DE SOLUCIONABILIDAD DEL PROYECTO
    prompt_parts.append("CRITERIOS DE SOLUCIONABILIDAD DEL PROYECTO:")
    prompt_parts.append(f"- **Peso dado a severidad:** {criterios_proyecto.get('peso_severidad', 70)}%")
    prompt_parts.append(f"- **Peso dado a solucionabilidad:** {criterios_proyecto.get('peso_solucionabilidad', 30)}%")
    prompt_parts.append(f"- **Umbral 'fácil de resolver':** ≥{criterios_proyecto.get('umbral_solucionabilidad_facil', 75)} puntos")
    prompt_parts.append(f"- **Umbral 'dificultad media':** ≥{criterios_proyecto.get('umbral_solucionabilidad_media', 50)} puntos")
    prompt_parts.append("")
    
    # ✅ PRIORIDADES ESPECÍFICAS DEL PROYECTO
    prompt_parts.append("PRIORIDADES ESPECÍFICAS CONFIGURADAS PARA ESTE PROYECTO:")
    if criterios_proyecto.get('priori_vectores_red', True):
        prompt_parts.append("✅ **ALTA PRIORIDAD:** Vulnerabilidades de vector de red (acceso remoto)")
    if criterios_proyecto.get('priori_sin_parches', True):
        prompt_parts.append("✅ **ALTA PRIORIDAD:** Vulnerabilidades sin parches oficiales disponibles")
    if criterios_proyecto.get('priori_exploit_publico', True):
        prompt_parts.append("✅ **ALTA PRIORIDAD:** Vulnerabilidades con exploits públicos disponibles")
    if criterios_proyecto.get('incluir_temporal_fixes', True):
        prompt_parts.append("✅ **INCLUIR:** Vulnerabilidades con soluciones temporales como solucionables")
    if criterios_proyecto.get('excluir_privilegios_altos', False):
        prompt_parts.append("⚠️ **MENOR PRIORIDAD:** Vulnerabilidades que requieren privilegios administrativos")
    prompt_parts.append("")
    
    # ✅ INSTRUCCIONES ESPECÍFICAS BASADAS EN CRITERIOS
    prompt_parts.append("INSTRUCCIONES DE ANÁLISIS BASADAS EN LOS CRITERIOS DEL PROYECTO:")
    
    peso_severidad = criterios_proyecto.get('peso_severidad', 70)
    peso_solucionabilidad = criterios_proyecto.get('peso_solucionabilidad', 30)
    
    if peso_severidad > peso_solucionabilidad:
        prompt_parts.append("- **Este proyecto PRIORIZA LA SEVERIDAD** sobre la facilidad de solución")
        prompt_parts.append("- Enfócate en vulnerabilidades críticas y de alta severidad, independientemente de qué tan difíciles sean de resolver")
        prompt_parts.append("- Menciona primero las vulnerabilidades más peligrosas, aunque sean complejas de solucionar")
    else:
        prompt_parts.append("- **Este proyecto PRIORIZA LA SOLUCIONABILIDAD** sobre la severidad pura")
        prompt_parts.append("- Enfócate en vulnerabilidades que sean más fáciles de resolver, incluso si son de severidad media")
        prompt_parts.append("- Sugiere comenzar por las vulnerabilidades más sencillas de resolver para obtener resultados rápidos")
    
    umbral_facil = criterios_proyecto.get('umbral_solucionabilidad_facil', 75)
    umbral_medio = criterios_proyecto.get('umbral_solucionabilidad_media', 50)
    
    prompt_parts.append(f"- Clasifica como **'FÁCIL DE RESOLVER'** las vulnerabilidades con ≥{umbral_facil} puntos de solucionabilidad")
    prompt_parts.append(f"- Clasifica como **'DIFICULTAD MEDIA'** las vulnerabilidades entre {umbral_medio}-{umbral_facil-1} puntos")
    prompt_parts.append(f"- Clasifica como **'DIFÍCIL DE RESOLVER'** las vulnerabilidades con <{umbral_medio} puntos")
    prompt_parts.append("")
    
    # ✅ FÓRMULA DE PRIORIZACIÓN PERSONALIZADA
    prompt_parts.append("FÓRMULA DE PRIORIZACIÓN DEL PROYECTO:")
    prompt_parts.append(f"**Prioridad Final = ({peso_severidad}% × Severidad) + ({peso_solucionabilidad}% × Solucionabilidad)**")
    prompt_parts.append("- Usa esta fórmula para determinar qué vulnerabilidades mencionar primero")
    prompt_parts.append("- Las vulnerabilidades con mayor prioridad final deben aparecer al inicio de tu análisis")
    prompt_parts.append("")
    
    # ✅ INFORMACIÓN BÁSICA DEL SBOM (reutilizar código existente)
    formato = sbom_data.get('formato', 'No especificado')
    total_componentes = sbom_data.get('resumen', {}).get('total_componentes', 'No disponible')
    
    prompt_parts.append("INFORMACIÓN DEL SBOM:")
    prompt_parts.append(f"- Formato: {formato}")
    prompt_parts.append(f"- Total de componentes: {total_componentes}")
    prompt_parts.append("")
    
    # ✅ COMPONENTE PRINCIPAL (si existe)
    if 'componente_principal' in sbom_data:
        comp = sbom_data['componente_principal']
        prompt_parts.append("COMPONENTE PRINCIPAL:")
        prompt_parts.append(f"- Nombre: {comp.get('nombre', 'No especificado')}")
        prompt_parts.append(f"- Versión: {comp.get('version', 'No especificada')}")
        prompt_parts.append(f"- Tipo: {comp.get('tipo', 'No especificado')}")
        prompt_parts.append("")
    
    # ✅ VULNERABILIDADES DE NVD CON ANÁLISIS PERSONALIZADO
    if sbom_data.get('vulnerabilidades_nvd'):
        vulnerabilidades_nvd = sbom_data['vulnerabilidades_nvd']
        nvd_analysis = sbom_data.get('resumen', {}).get('nvd_analysis', {})
        
        prompt_parts.append("ANÁLISIS DE VULNERABILIDADES (NATIONAL VULNERABILITY DATABASE):")
        prompt_parts.append(f"- Componentes analizados: {nvd_analysis.get('componentes_analizados', 0)}")
        prompt_parts.append(f"- Componentes con vulnerabilidades: {nvd_analysis.get('componentes_vulnerables', 0)}")
        prompt_parts.append(f"- Total vulnerabilidades encontradas: {len(vulnerabilidades_nvd)}")
        
        # ✅ ANÁLISIS DE SOLUCIONABILIDAD PERSONALIZADO
        if any(vuln.get('solucionabilidad_personalizada') for vuln in vulnerabilidades_nvd):
            prompt_parts.append("\n**ANÁLISIS DE SOLUCIONABILIDAD PERSONALIZADO APLICADO:**")
            
            # Contar por nivel de solucionabilidad personalizado
            facil = sum(1 for v in vulnerabilidades_nvd if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'FÁCIL')
            moderada = sum(1 for v in vulnerabilidades_nvd if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'MODERADA')
            dificil = sum(1 for v in vulnerabilidades_nvd if v.get('solucionabilidad_personalizada', {}).get('nivel') in ['DIFÍCIL', 'MUY_DIFÍCIL'])
            
            prompt_parts.append(f"- 🟢 **Fácil de resolver:** {facil} vulnerabilidades")
            prompt_parts.append(f"- 🟡 **Dificultad media:** {moderada} vulnerabilidades")
            prompt_parts.append(f"- 🔴 **Difícil de resolver:** {dificil} vulnerabilidades")
            
            # ✅ TOP VULNERABILIDADES SEGÚN PRIORIDAD PERSONALIZADA (AUMENTADO A 10)
            vulns_priorizadas = sorted(
                [v for v in vulnerabilidades_nvd if v.get('solucionabilidad_personalizada')],
                key=lambda x: x.get('solucionabilidad_personalizada', {}).get('prioridad_personalizada', 0),
                reverse=True
            )[:10]  # ✅ AUMENTADO A 10
            
            if vulns_priorizadas:
                prompt_parts.append(f"\n**TOP 10 VULNERABILIDADES SEGÚN TUS CRITERIOS:**")
                for i, vuln in enumerate(vulns_priorizadas, 1):
                    cve_id = vuln.get('cve_id', 'N/A')
                    severidad = vuln.get('severidad', 'UNKNOWN')
                    solucionabilidad = vuln.get('solucionabilidad_personalizada', {})
                    nivel_sol = solucionabilidad.get('nivel', 'UNKNOWN')
                    prioridad = solucionabilidad.get('prioridad_personalizada', 0)
                    puntos_sol = solucionabilidad.get('puntos_solucionabilidad', 0)
                    comp = vuln.get('componente_afectado', {})
                    
                    prompt_parts.append(f"  {i}. **{cve_id}** en *{comp.get('nombre', 'Unknown')}* {comp.get('version', '')}")
                    prompt_parts.append(f"     - Severidad: **{severidad}** | Solucionabilidad: **{nivel_sol}** ({puntos_sol} pts) | Prioridad: **{prioridad:.1f}**")
                    prompt_parts.append(f"     - Descripción: {vuln.get('descripcion', 'Sin descripción')[:100]}...")
                    
                    # ✅ AGREGAR RAZONES DE SOLUCIONABILIDAD
                    razones = solucionabilidad.get('razones_solucionabilidad', [])
                    if razones:
                        prompt_parts.append(f"     - **Factores:** {', '.join(razones[:3])}")  # Primeras 3 razones
            
            # ✅ EJEMPLOS ESPECÍFICOS DE VULNERABILIDADES FÁCILES
            vulns_faciles = [v for v in vulnerabilidades_nvd 
                           if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'FÁCIL']
            
            if vulns_faciles and len(vulns_faciles) > len([v for v in vulns_priorizadas if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'FÁCIL']):
                prompt_parts.append(f"\n**EJEMPLOS ADICIONALES DE VULNERABILIDADES FÁCILES DE RESOLVER:**")
                
                # Obtener vulnerabilidades fáciles que no están en el top 10
                faciles_extra = [v for v in vulns_faciles if v not in vulns_priorizadas][:5]
                
                for i, vuln in enumerate(faciles_extra, 1):
                    cve_id = vuln.get('cve_id', 'N/A')
                    severidad = vuln.get('severidad', 'UNKNOWN')
                    solucionabilidad = vuln.get('solucionabilidad_personalizada', {})
                    puntos_sol = solucionabilidad.get('puntos_solucionabilidad', 0)
                    comp = vuln.get('componente_afectado', {})
                    razones = solucionabilidad.get('razones_solucionabilidad', [])
                    
                    prompt_parts.append(f"  {i}. **{cve_id}** en *{comp.get('nombre', 'Unknown')}* {comp.get('version', '')}")
                    prompt_parts.append(f"     - Severidad: **{severidad}** | Solucionabilidad: **{puntos_sol} puntos** (FÁCIL)")
                    prompt_parts.append(f"     - **Por qué es fácil:** {', '.join(razones[:2]) if razones else 'Múltiples factores positivos'}")
                    prompt_parts.append(f"     - Descripción: {vuln.get('descripcion', 'Sin descripción')[:80]}...")
            
            # ✅ EJEMPLOS DE VULNERABILIDADES DE DIFICULTAD MEDIA
            vulns_medias = [v for v in vulnerabilidades_nvd 
                          if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'MODERADA']
            
            if vulns_medias:
                prompt_parts.append(f"\n**EJEMPLOS DE VULNERABILIDADES DE DIFICULTAD MEDIA ({len(vulns_medias)} total):**")
                
                for i, vuln in enumerate(vulns_medias[:3], 1):  # Solo 3 ejemplos
                    cve_id = vuln.get('cve_id', 'N/A')
                    severidad = vuln.get('severidad', 'UNKNOWN')
                    solucionabilidad = vuln.get('solucionabilidad_personalizada', {})
                    puntos_sol = solucionabilidad.get('puntos_solucionabilidad', 0)
                    comp = vuln.get('componente_afectado', {})
                    razones = solucionabilidad.get('razones_solucionabilidad', [])
                    
                    prompt_parts.append(f"  {i}. **{cve_id}** en *{comp.get('nombre', 'Unknown')}* {comp.get('version', '')}")
                    prompt_parts.append(f"     - Severidad: **{severidad}** | Solucionabilidad: **{puntos_sol} puntos** (MEDIA)")
                    prompt_parts.append(f"     - Factores: {', '.join(razones[:2]) if razones else 'Complejidad moderada'}")
        
        # ✅ AÑADIR INFORMACIÓN SOBRE VULNERABILIDADES ADICIONALES
        total_vulns = len(vulnerabilidades_nvd)
        vulns_mostradas = len(vulns_priorizadas) if 'vulns_priorizadas' in locals() else 0
        
        if total_vulns > vulns_mostradas:
            prompt_parts.append(f"\n**VULNERABILIDADES ADICIONALES:** Se encontraron {total_vulns - vulns_mostradas} vulnerabilidades adicionales.")
            prompt_parts.append("En tu análisis, menciona que hay más vulnerabilidades y explica cómo están priorizadas según los criterios del proyecto.")
        
        # ✅ DISTRIBUCIÓN POR SEVERIDAD (código existente)
        severidades = {}
        for vuln in vulnerabilidades_nvd:
            sev = vuln.get('severidad', 'UNKNOWN')
            severidades[sev] = severidades.get(sev, 0) + 1
        
        prompt_parts.append("\n- **Distribución por severidad:**")
        for sev, count in sorted(severidades.items(), key=lambda x: {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0}.get(x[0], 0), reverse=True):
            emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢', 'UNKNOWN': '⚪'}.get(sev, '⚪')
            prompt_parts.append(f"  {emoji} {sev}: {count} vulnerabilidades")
        
        prompt_parts.append("")
    
    # ✅ CONSULTA DEL USUARIO
    prompt_parts.append(f"CONSULTA DEL USUARIO: {mensaje_usuario}")
    prompt_parts.append("")
    
    # ✅ INSTRUCCIONES FINALES MEJORADAS
    prompt_parts.append("INSTRUCCIONES FINALES PARA EL ANÁLISIS:")
    prompt_parts.append("1. **RESPETA LOS CRITERIOS DE SOLUCIONABILIDAD** configurados para este proyecto específico")
    prompt_parts.append("2. **ORDENA LAS VULNERABILIDADES** según la prioridad calculada con la fórmula del proyecto")
    prompt_parts.append("3. **ENFÓCATE EN EL ENFOQUE DEL PROYECTO:** severidad vs. solucionabilidad según los pesos configurados")
    prompt_parts.append("4. **MENCIONA LOS CRITERIOS** específicos que has aplicado en tu análisis")
    prompt_parts.append("5. **DA RECOMENDACIONES ESPECÍFICAS** basadas en los umbrales y prioridades del proyecto")
    prompt_parts.append("6. **PROPORCIONA EJEMPLOS ESPECÍFICOS** de las vulnerabilidades mencionadas arriba cuando sea relevante")
    prompt_parts.append("7. **SI HAY MUCHAS VULNERABILIDADES**, proporciona un resumen con las más críticas y menciona el total")
    prompt_parts.append("8. **CUANDO EL USUARIO PREGUNTE POR VULNERABILIDADES ESPECÍFICAS**, usa la información detallada proporcionada")
    prompt_parts.append("")
    
    # ✅ FORMATO DE RESPUESTA
    prompt_parts.append("FORMATO DE RESPUESTA:")
    prompt_parts.append("- Comienza mencionando que has aplicado los criterios específicos del proyecto")
    prompt_parts.append("- Usa **negrita** para CVEs y puntos críticos")
    prompt_parts.append("- Usa *cursiva* para severidades y nombres de componentes")
    prompt_parts.append("- Organiza en secciones: Resumen Ejecutivo, Vulnerabilidades Prioritarias, Recomendaciones Específicas")
    prompt_parts.append("- Incluye `código` para nombres técnicos de componentes")
    prompt_parts.append("- Menciona explícitamente qué criterios de solucionabilidad has aplicado")
    prompt_parts.append("- **PROPORCIONA EJEMPLOS CONCRETOS** cuando el usuario solicite vulnerabilidades específicas")
    
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

def extraer_score_cvss(cve_data):
    """Extrae score CVSS del CVE"""
    try:
        cvss_data = cve_data.get('cvss', {})
        
        # Intentar CVSS v3.1 primero
        base_metrics_v31 = cvss_data.get('baseMetricV31', {})
        if base_metrics_v31:
            cvss_v31 = base_metrics_v31.get('cvssV31', {})
            if 'baseScore' in cvss_v31:
                return float(cvss_v31['baseScore'])
        
        # Intentar CVSS v3.0
        base_metrics_v3 = cvss_data.get('baseMetricV3', {})
        if base_metrics_v3:
            cvss_v3 = base_metrics_v3.get('cvssV3', {})
            if 'baseScore' in cvss_v3:
                return float(cvss_v3['baseScore'])
        
        # Intentar CVSS v2 como fallback
        base_metrics_v2 = cvss_data.get('baseMetricV2', {})
        if base_metrics_v2:
            cvss_v2 = base_metrics_v2.get('cvssV2', {})
            if 'baseScore' in cvss_v2:
                return float(cvss_v2['baseScore'])
        
        return 0.0
        
    except Exception as e:
        print(f"❌ Error extrayendo score CVSS: {e}")
        return 0.0

def calcular_solucionabilidad_personalizada(vuln_data, criterios_proyecto):
    """
    Calcula la solucionabilidad personalizada de una vulnerabilidad según los criterios del proyecto
    """
    puntos_solucionabilidad = 0
    razones_solucionabilidad = []
    
    # ✅ FACTORES QUE AUMENTAN LA SOLUCIONABILIDAD
    
    # Factor 1: Disponibilidad de parches oficiales (+30 puntos)
    referencias = vuln_data.get('referencias', [])
    tiene_parche_oficial = any('patch' in ref.lower() or 'update' in ref.lower() or 'advisory' in ref.lower() 
                             for ref in referencias)
    if tiene_parche_oficial:
        puntos_solucionabilidad += 30
        razones_solucionabilidad.append("Parche oficial disponible")
    
    # Factor 2: Vulnerabilidad de severidad baja/media (+20 puntos para LOW, +15 para MEDIUM)
    severidad = vuln_data.get('severidad', 'UNKNOWN')
    if severidad == 'LOW':
        puntos_solucionabilidad += 20
        razones_solucionabilidad.append("Severidad baja")
    elif severidad == 'MEDIUM':
        puntos_solucionabilidad += 15
        razones_solucionabilidad.append("Severidad media")
    
    # Factor 3: Score CVSS bajo (+15 puntos si <5.0, +10 si <7.0)
    score_cvss = vuln_data.get('score_cvss', 0)
    if score_cvss < 5.0:
        puntos_solucionabilidad += 15
        razones_solucionabilidad.append("Score CVSS bajo (<5.0)")
    elif score_cvss < 7.0:
        puntos_solucionabilidad += 10
        razones_solucionabilidad.append("Score CVSS moderado (<7.0)")
    
    # Factor 4: NO requiere privilegios altos (+15 puntos)
    vector_cvss = vuln_data.get('vector_cvss', '')
    if 'PR:H' not in vector_cvss:  # PR:H = Privilegios Altos requeridos
        puntos_solucionabilidad += 15
        razones_solucionabilidad.append("No requiere privilegios altos")
    
    # Factor 5: Vector de acceso local (+10 puntos - más fácil de mitigar)
    if 'AV:L' in vector_cvss:  # AV:L = Vector de Acceso Local
        puntos_solucionabilidad += 10
        razones_solucionabilidad.append("Acceso solo local")
    
    # Factor 6: Componente con muchas referencias/documentación (+10 puntos)
    if len(referencias) >= 3:
        puntos_solucionabilidad += 10
        razones_solucionabilidad.append("Bien documentada")
    
    # ✅ FACTORES QUE REDUCEN LA SOLUCIONABILIDAD
    
    # Factor 7: Sin exploits públicos conocidos (+15 puntos)
    tiene_exploit = any('exploit' in ref.lower() or 'poc' in ref.lower() 
                       for ref in referencias)
    if not tiene_exploit:
        puntos_solucionabilidad += 15
        razones_solucionabilidad.append("Sin exploits públicos")
    else:
        razones_solucionabilidad.append("Exploits públicos disponibles")
    
    # Factor 8: Vulnerabilidad reciente (-10 puntos si es de este año)
    fecha_pub = vuln_data.get('fecha_publicacion', '')
    if fecha_pub and '2024' in fecha_pub or '2023' in fecha_pub:
        puntos_solucionabilidad -= 5
        razones_solucionabilidad.append("Vulnerabilidad reciente")
    
    # ✅ APLICAR CRITERIOS ESPECÍFICOS DEL PROYECTO
    
    # Prioridad para vectores de red
    if criterios_proyecto.get('priori_vectores_red', True):
        if 'AV:N' in vector_cvss:  # Vector de red
            puntos_solucionabilidad -= 10
            razones_solucionabilidad.append("Vector de red (alta prioridad proyecto)")
    
    # Prioridad para vulnerabilidades sin parches
    if criterios_proyecto.get('priori_sin_parches', True):
        if not tiene_parche_oficial:
            puntos_solucionabilidad -= 15
            razones_solucionabilidad.append("Sin parche oficial (alta prioridad proyecto)")
    
    # Incluir fixes temporales
    if criterios_proyecto.get('incluir_temporal_fixes', True):
        tiene_workaround = any('workaround' in ref.lower() or 'mitigation' in ref.lower() 
                              for ref in referencias)
        if tiene_workaround:
            puntos_solucionabilidad += 10
            razones_solucionabilidad.append("Workaround disponible")
    
    # Excluir privilegios altos (ya aplicado arriba)
    if criterios_proyecto.get('excluir_privilegios_altos', False):
        if 'PR:H' in vector_cvss:
            puntos_solucionabilidad -= 20
            razones_solucionabilidad.append("Requiere privilegios altos (menor prioridad proyecto)")
    
    # ✅ NORMALIZAR PUNTOS (0-100)
    puntos_solucionabilidad = max(0, min(100, puntos_solucionabilidad))
    
    # ✅ DETERMINAR NIVEL DE SOLUCIONABILIDAD
    umbral_facil = criterios_proyecto.get('umbral_solucionabilidad_facil', 75)
    umbral_medio = criterios_proyecto.get('umbral_solucionabilidad_media', 50)
    
    if puntos_solucionabilidad >= umbral_facil:
        nivel = 'FÁCIL'
    elif puntos_solucionabilidad >= umbral_medio:
        nivel = 'MODERADA'
    else:
        nivel = 'DIFÍCIL'
    
    # ✅ CALCULAR PRIORIDAD PERSONALIZADA
    peso_severidad = criterios_proyecto.get('peso_severidad', 70) / 100
    peso_solucionabilidad = criterios_proyecto.get('peso_solucionabilidad', 30) / 100
    
    # Convertir severidad a puntos (0-100)
    puntos_severidad = {'LOW': 25, 'MEDIUM': 50, 'HIGH': 75, 'CRITICAL': 100}.get(severidad, 50)
    
    prioridad_personalizada = (peso_severidad * puntos_severidad) + (peso_solucionabilidad * puntos_solucionabilidad)
    
    return {
        'puntos_solucionabilidad': puntos_solucionabilidad,
        'nivel': nivel,
        'razones_solucionabilidad': razones_solucionabilidad,
        'prioridad_personalizada': prioridad_personalizada,
        'puntos_severidad': puntos_severidad
    }

@app.route('/chat/upload-sbom', methods=['POST'])
def upload_sbom():
    try:
        print("🚀 Iniciando procesamiento de SBOM...")
        
        # ✅ VALIDAR ARCHIVO
        if 'file' not in request.files:
            return jsonify({"error": "No se proporcionó archivo"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Nombre de archivo vacío"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Tipo de archivo no permitido"}), 400
        
        # ✅ OBTENER USUARIO ID
        user_id = obtener_usuario_id(request)
        
        # ✅ OBTENER PARÁMETROS ADICIONALES
        proyecto_id = request.form.get('proyecto_id')
        limite_vulnerabilidades = request.form.get('limite_vulnerabilidades', 10)
        max_severidad = request.form.get('max_severidad', 'MEDIUM')
        mensaje_usuario = request.form.get('mensaje', 'Analiza este archivo SBOM')
        
        print(f"📁 Archivo recibido: {file.filename}")
        print(f"🎯 Proyecto ID: {proyecto_id}")
        print(f"👤 Usuario ID: {user_id}")
        print(f"📊 Límite vulnerabilidades: {limite_vulnerabilidades}")
        print(f"🔺 Severidad máxima: {max_severidad}")
        
        # ✅ GUARDAR ARCHIVO TEMPORALMENTE
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        print(f"💾 Archivo guardado en: {file_path}")
        
        # ✅ OBTENER CRITERIOS DE SOLUCIONABILIDAD DEL PROYECTO
        criterios_solucionabilidad = {}
        proyecto_nombre = "Proyecto no especificado"
        
        if proyecto_id:
            try:
                api_host = os.getenv('API_HOST', 'host.docker.internal')
                api_port = os.getenv('API_PORT', '5001')
                
                # Obtener cookies para autenticación
                cookies = {}
                if hasattr(request, 'cookies') and request.cookies:
                    for name, value in request.cookies.items():
                        cookies[name] = value
                
                criterios_response = requests.get(
                    f"http://{api_host}:{api_port}/proyectos/{proyecto_id}",
                    cookies=cookies,
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                
                if criterios_response.status_code == 200:
                    proyecto_data = criterios_response.json()
                    proyecto_nombre = proyecto_data.get('nombre', 'Proyecto no especificado')
                    criterios_solucionabilidad = {
                        'priori_vectores_red': proyecto_data.get('priori_vectores_red', True),
                        'priori_sin_parches': proyecto_data.get('priori_sin_parches', True),
                        'priori_exploit_publico': proyecto_data.get('priori_exploit_publico', True),
                        'peso_severidad': proyecto_data.get('peso_severidad', 70),
                        'peso_solucionabilidad': proyecto_data.get('peso_solucionabilidad', 30),
                        'umbral_solucionabilidad_facil': proyecto_data.get('umbral_solucionabilidad_facil', 75),
                        'umbral_solucionabilidad_media': proyecto_data.get('umbral_solucionabilidad_media', 50),
                        'incluir_temporal_fixes': proyecto_data.get('incluir_temporal_fixes', True),
                        'excluir_privilegios_altos': proyecto_data.get('excluir_privilegios_altos', False)
                    }
                    print(f"🎯 Criterios de solucionabilidad obtenidos: {criterios_solucionabilidad}")
                else:
                    print(f"⚠️ No se pudieron obtener criterios del proyecto: {criterios_response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Error obteniendo criterios del proyecto: {e}")
        
        # ✅ VALIDAR CONTENIDO DEL SBOM
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            is_valid, validation_message = validar_contenido_sbom(content, filename)
            if not is_valid:
                os.remove(file_path)
                return jsonify({
                    "error": f"Archivo no válido: {validation_message}"
                }), 400
            
            print(f"✅ Validación exitosa: {validation_message}")
            
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except Exception as e:
                os.remove(file_path)
                return jsonify({
                    "error": f"Error de codificación del archivo: {str(e)}"
                }), 400
        
        # ✅ PROCESAR SBOM
        try:
            sbom_data = procesar_archivo_sbom(file_path, filename)
            if not sbom_data:
                os.remove(file_path)
                return jsonify({"error": "No se pudo procesar el archivo SBOM"}), 400
            
            print(f"📋 SBOM procesado: {sbom_data.get('formato', 'Desconocido')}")
            
        except Exception as e:
            print(f"❌ Error procesando SBOM: {e}")
            os.remove(file_path)
            return jsonify({
                "error": f"Error procesando SBOM: {str(e)}"
            }), 500
        
        # ✅ ENRIQUECER CON DATOS DE NVD
        try:
            print("🔍 Consultando National Vulnerability Database...")
            sbom_data = asyncio.run(enriquecer_sbom_con_nvd(sbom_data))
            
        except Exception as e:
            print(f"⚠️ Error consultando NVD (continuando sin datos NVD): {e}")
        
        # ✅ APLICAR ANÁLISIS DE SOLUCIONABILIDAD PERSONALIZADA
        analisis_solucionabilidad_personalizado = None
        if criterios_solucionabilidad and isinstance(sbom_data, dict) and 'vulnerabilidades_nvd' in sbom_data:
            try:
                print("🎯 Aplicando análisis de solucionabilidad personalizada...")
                
                # Enriquecer cada vulnerabilidad con solucionabilidad personalizada
                for vuln in sbom_data['vulnerabilidades_nvd']:
                    solucionabilidad_personalizada = calcular_solucionabilidad_personalizada(
                        vuln, criterios_solucionabilidad
                    )
                    vuln['solucionabilidad_personalizada'] = solucionabilidad_personalizada
                
                # Ordenar vulnerabilidades por prioridad personalizada (mayor prioridad primero)
                sbom_data['vulnerabilidades_nvd'] = sorted(
                    sbom_data['vulnerabilidades_nvd'],
                    key=lambda x: x.get('solucionabilidad_personalizada', {}).get('prioridad_personalizada', 0),
                    reverse=True
                )
                
                # Generar estadísticas de solucionabilidad personalizada
                total_vulns = len(sbom_data['vulnerabilidades_nvd'])
                facil = sum(1 for v in sbom_data['vulnerabilidades_nvd'] 
                           if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'FÁCIL')
                moderada = sum(1 for v in sbom_data['vulnerabilidades_nvd'] 
                              if v.get('solucionabilidad_personalizada', {}).get('nivel') == 'MODERADA')
                dificil = sum(1 for v in sbom_data['vulnerabilidades_nvd'] 
                             if v.get('solucionabilidad_personalizada', {}).get('nivel') in ['DIFÍCIL', 'MUY_DIFÍCIL'])
                
                # Calcular vulnerabilidades de alta prioridad (top 20% o score > 75)
                alta_prioridad = sum(1 for v in sbom_data['vulnerabilidades_nvd'] 
                                   if v.get('solucionabilidad_personalizada', {}).get('prioridad_personalizada', 0) > 75)
                
                analisis_solucionabilidad_personalizado = {
                    'peso_severidad': criterios_solucionabilidad.get('peso_severidad', 70),
                    'peso_solucionabilidad': criterios_solucionabilidad.get('peso_solucionabilidad', 30),
                    'umbral_facil': criterios_solucionabilidad.get('umbral_solucionabilidad_facil', 75),
                    'umbral_medio': criterios_solucionabilidad.get('umbral_solucionabilidad_media', 50),
                    'total_vulnerabilidades': total_vulns,
                    'facil': facil,
                    'moderada': moderada,
                    'dificil': dificil,
                    'alta_prioridad': alta_prioridad,
                    'criterios_aplicados': criterios_solucionabilidad
                }
                
                # Añadir al SBOM
                sbom_data['analisis_solucionabilidad_personalizado'] = analisis_solucionabilidad_personalizado
                
                print(f"✅ Análisis personalizado completado:")
                print(f"   - Fácil: {facil}, Media: {moderada}, Difícil: {dificil}")
                print(f"   - Alta prioridad: {alta_prioridad}")
                
            except Exception as e:
                print(f"⚠️ Error en análisis de solucionabilidad personalizada: {e}")
        
        # ✅ VERIFICAR LÍMITES DEL PROYECTO CON ANÁLISIS AVANZADO
        limites_info = None
        if proyecto_id:
            try:
                vulnerabilidades_encontradas = len(sbom_data.get('vulnerabilidades_nvd', []))
                limites_info = verificar_limites_proyecto_avanzado(
                    proyecto_id, 
                    vulnerabilidades_encontradas, 
                    sbom_data.get('vulnerabilidades_nvd', []),
                    limite_vulnerabilidades,
                    max_severidad
                )
                print(f"📊 Verificación de límites: {limites_info}")
                
            except Exception as e:
                print(f"⚠️ Error verificando límites: {e}")
        
        # ✅ GUARDAR SBOM EN EL HISTORIAL DEL USUARIO
        try:
            if user_id not in historial_conversaciones:
                historial_conversaciones[user_id] = []
            
            # Guardar información del SBOM para contexto futuro
            sbom_context = {
                'tipo': 'sbom_analysis',
                'filename': filename,
                'proyecto_id': proyecto_id,
                'proyecto_nombre': proyecto_nombre,
                'sbom_data': sbom_data,  # ✅ GUARDAR TODO EL SBOM PROCESADO
                'criterios_solucionabilidad': criterios_solucionabilidad,
                'timestamp': datetime.now().isoformat(),
                'resumen_vulnerabilidades': {
                    'total': len(sbom_data.get('vulnerabilidades_nvd', [])),
                    'por_severidad': {},
                    'componentes_analizados': sbom_data.get('resumen', {}).get('nvd_analysis', {}).get('componentes_analizados', 0)
                }
            }
            
            # Calcular distribución por severidad para resumen
            if sbom_data.get('vulnerabilidades_nvd'):
                for vuln in sbom_data['vulnerabilidades_nvd']:
                    sev = vuln.get('severidad', 'UNKNOWN')
                    sbom_context['resumen_vulnerabilidades']['por_severidad'][sev] = \
                        sbom_context['resumen_vulnerabilidades']['por_severidad'].get(sev, 0) + 1
            
            # ✅ AGREGAR AL HISTORIAL COMO CONTEXTO ESPECIAL
            historial_conversaciones[user_id].append(f"CONTEXTO_SBOM: {json.dumps(sbom_context)}")
            
            print(f"✅ SBOM guardado en historial para usuario: {user_id}")
            
        except Exception as e:
            print(f"⚠️ Error guardando SBOM en historial: {e}")
        
        # ✅ GENERAR RESPUESTA DE IA CON CRITERIOS PERSONALIZADOS
        ai_response = "Archivo SBOM procesado correctamente."
        
        if model and sbom_data:
            try:
                # Usar prompt personalizado si hay criterios, sino el genérico
                prompt = generar_prompt_sbom(sbom_data, mensaje_usuario, criterios_solucionabilidad)
                
                print(f"🧠 Generando respuesta de IA...")
                response_ia = model.generate_content(prompt)
                ai_response = response_ia.text
                
                # ✅ GUARDAR TAMBIÉN LA RESPUESTA DE LA IA EN EL HISTORIAL
                if user_id in historial_conversaciones:
                    historial_conversaciones[user_id].append(f"Usuario [SBOM]: {mensaje_usuario}")
                    historial_conversaciones[user_id].append(f"Bot [Análisis SBOM]: {ai_response}")
                
                if criterios_solucionabilidad:
                    print(f"✅ IA consciente de criterios de solucionabilidad del proyecto")
                
            except Exception as e:
                print(f"⚠️ Error generando respuesta de IA: {e}")
                ai_response = f"Archivo SBOM procesado. Error en IA: {str(e)}"
        
        # ✅ LIMPIAR ARCHIVO TEMPORAL
        try:
            os.remove(file_path)
            print(f"🗑️ Archivo temporal eliminado: {file_path}")
        except Exception as e:
            print(f"⚠️ Error eliminando archivo temporal: {e}")
        
        # ✅ CONSTRUIR RESPUESTA FINAL
        response_data = {
            "message": ai_response,
            "sbom_info": {
                "filename": filename,
                "formato": sbom_data.get('formato', 'Desconocido'),
                "componentes": sbom_data.get('resumen', {}).get('total_componentes', 0),
                "nvd_analysis": sbom_data.get('resumen', {}).get('nvd_analysis', {}),
                "analisis_solucionabilidad_personalizado": analisis_solucionabilidad_personalizado
            },
            "criterios_aplicados": bool(criterios_solucionabilidad),
            "limites_info": limites_info
        }
        
        print(f"✅ Procesamiento completado exitosamente")
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Error general en upload_sbom: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Limpiar archivo si existe
        try:
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        
        return jsonify({
            "error": f"Error interno del servidor: {str(e)}"
        }), 500

def verificar_limites_proyecto_avanzado(proyecto_id, vulnerabilidades_encontradas, vulnerabilidades_nvd, limite_configurado, max_severidad_configurada):
    """
    Verifica límites del proyecto con análisis avanzado de severidad
    """
    try:
        # Convertir límites a enteros y validar
        try:
            limite_configurado = int(limite_configurado)
        except (ValueError, TypeError):
            limite_configurado = 10
        
        # Validar severidad
        severidades_validas = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        if max_severidad_configurada not in severidades_validas:
            max_severidad_configurada = 'MEDIUM'
        
        # Mapeo de severidades para comparación
        severidad_niveles = {
            'LOW': 1,
            'MEDIUM': 2, 
            'HIGH': 3,
            'CRITICAL': 4
        }
        
        max_nivel_permitido = severidad_niveles.get(max_severidad_configurada, 2)
        
        # Analizar vulnerabilidades que exceden la severidad permitida
        vulnerabilidades_exceden_severidad = 0
        for vuln in vulnerabilidades_nvd:
            severidad_vuln = vuln.get('severidad', 'UNKNOWN')
            if severidad_vuln in severidad_niveles:
                if severidad_niveles[severidad_vuln] > max_nivel_permitido:
                    vulnerabilidades_exceden_severidad += 1
        
        # Determinar qué límites se exceden
        excede_limite_cantidad = vulnerabilidades_encontradas > limite_configurado
        excede_limite_severidad = vulnerabilidades_exceden_severidad > 0
        excede_limite = excede_limite_cantidad or excede_limite_severidad
        
        # Calcular diferencias
        diferencia_cantidad = max(0, vulnerabilidades_encontradas - limite_configurado)
        porcentaje_usado = min(100, (vulnerabilidades_encontradas / limite_configurado) * 100) if limite_configurado > 0 else 100
        
        return {
            'excede_limite': excede_limite,
            'excede_limite_cantidad': excede_limite_cantidad,
            'excede_limite_severidad': excede_limite_severidad,
            'limite_configurado': limite_configurado,
            'max_severidad_configurada': max_severidad_configurada,
            'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
            'vulnerabilidades_exceden_severidad': vulnerabilidades_exceden_severidad,
            'diferencia_cantidad': diferencia_cantidad,
            'porcentaje_usado': round(porcentaje_usado, 1),
            'proyecto_encontrado': True
        }
        
    except Exception as e:
        print(f"❌ Error en verificación avanzada de límites: {e}")
        return {
            'excede_limite': False,
            'limite_configurado': None,
            'max_severidad_configurada': None,
            'vulnerabilidades_encontradas': vulnerabilidades_encontradas,
            'diferencia_cantidad': 0,
            'proyecto_encontrado': False,
            'error': f'Error inesperado: {str(e)}'
        }

def obtener_info_proyecto(proyecto_id):
    """Obtiene información COMPLETA del proyecto incluyendo criterios de solucionabilidad"""
    try:
        api_host = os.getenv('API_HOST', 'host.docker.internal')
        api_port = os.getenv('API_PORT', '5001')

        print(f"🔍 Consultando información del proyecto {proyecto_id} en {api_host}:{api_port}")
        
        cookies = {}
        if hasattr(request, 'cookies') and request.cookies:
            for name, value in request.cookies.items():
                cookies[name] = value
        
        response = requests.get(
            f"http://{api_host}:{api_port}/proyectos/{proyecto_id}",
            cookies=cookies,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            proyecto_data = response.json()
            return {
                'proyecto_encontrado': True,
                'limite_configurado': proyecto_data.get('max_vulnerabilidades', 10),
                'max_severidad_configurada': proyecto_data.get('max_severidad', 'MEDIUM'),
                'proyecto_data': proyecto_data  # ✅ INCLUIR DATOS COMPLETOS
            }
        else:
            return {'proyecto_encontrado': False, 'error': f'Error HTTP {response.status_code}'}
            
    except Exception as e:
        return {'proyecto_encontrado': False, 'error': str(e)}

@app.route('/chat/mensajes', methods=['POST'])
def chat_mensajes():
    """ Endpoint para enviar mensajes al chat y obtener respuestas de IA con contexto de proyecto """
    try:
        data = request.json
        mensaje = data.get('message', '')
        proyecto_id = data.get('proyecto_id', '')  
        proyecto_nombre = data.get('proyecto_nombre', '')  
        
        if not mensaje:
            return jsonify({"error": "Mensaje vacío"}), 400
        
        user_id = obtener_usuario_id(request)
        
        # ✅ DETECTAR TIPO DE PREGUNTA ANTES DE GENERAR CONTEXTO
        es_pregunta_sbom = es_pregunta_relacionada_sbom(mensaje)
        print(f"🔍 Pregunta sobre SBOM detectada: {es_pregunta_sbom}")
        print(f"📝 Mensaje: '{mensaje}'")
        
        # ✅ OBTENER CONTEXTO COMPLETO DEL PROYECTO CON CRITERIOS DE SOLUCIONABILIDAD
        contexto_proyecto = ""
        if proyecto_id:
            try:
                # Obtener información completa del proyecto
                proyecto_info = obtener_info_proyecto(proyecto_id)
                
                if proyecto_info.get('proyecto_encontrado'):
                    proyecto_data = proyecto_info.get('proyecto_data', {})
                    
                    # ✅ CONTEXTO DE PROYECTO REDUCIDO PARA PREGUNTAS SIMPLES
                    if not es_pregunta_sbom:
                        contexto_proyecto = f"""
**PROYECTO ACTIVO: {proyecto_nombre}**
- Límite de vulnerabilidades: {proyecto_data.get('max_vulnerabilidades', 10)}
- Severidad máxima: {proyecto_data.get('max_severidad', 'MEDIUM')}
"""
                    else:
                        # Contexto completo solo para preguntas sobre SBOM
                        contexto_proyecto = f"""
**CONTEXTO DEL PROYECTO ACTIVO: {proyecto_nombre}**

**Configuración de Seguridad:**
- Límite de vulnerabilidades aceptadas: {proyecto_data.get('max_vulnerabilidades', 10)}
- Severidad máxima aceptada: {proyecto_data.get('max_severidad', 'MEDIUM')}

**Criterios de Solucionabilidad Personalizados:**
- Peso de Severidad: {proyecto_data.get('peso_severidad', 70)}%
- Peso de Solucionabilidad: {proyecto_data.get('peso_solucionabilidad', 30)}%
- Umbral "Fácil de resolver": ≥{proyecto_data.get('umbral_solucionabilidad_facil', 75)} puntos
- Umbral "Dificultad media": ≥{proyecto_data.get('umbral_solucionabilidad_media', 50)} puntos

**Prioridades Configuradas:**
- Priorizar vulnerabilidades de vector de red: {'SÍ' if proyecto_data.get('priori_vectores_red', True) else 'NO'}
- Priorizar vulnerabilidades sin parches: {'SÍ' if proyecto_data.get('priori_sin_parches', True) else 'NO'}
- Priorizar vulnerabilidades con exploits públicos: {'SÍ' if proyecto_data.get('priori_exploit_publico', True) else 'NO'}
- Incluir soluciones temporales: {'SÍ' if proyecto_data.get('incluir_temporal_fixes', True) else 'NO'}
- Excluir vulnerabilidades que requieren privilegios altos: {'SÍ' if proyecto_data.get('excluir_privilegios_altos', False) else 'NO'}

**Fórmula de Priorización:**
Prioridad = ({proyecto_data.get('peso_severidad', 70)}% × Severidad) + ({proyecto_data.get('peso_solucionabilidad', 30)}% × Solucionabilidad Invertida)
"""
                else:
                    contexto_proyecto = f"\n**PROYECTO ACTIVO:** {proyecto_nombre}\n"
                    
            except Exception as e:
                print(f"⚠️ Error obteniendo contexto del proyecto: {e}")
                contexto_proyecto = f"\n**PROYECTO ACTIVO:** {proyecto_nombre}\n"
        
        # ✅ INICIALIZAR HISTORIAL SI NO EXISTE
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = []
        
        historial_usuario = historial_conversaciones[user_id]
        
        # ✅ GENERAR RESPUESTA CON IA USANDO CONTEXTO OPTIMIZADO
        if model:
            try:
                # ✅ GENERAR CONTEXTO OPTIMIZADO SEGÚN TIPO DE PREGUNTA
                contexto_previo = formatear_historial_para_ai(historial_usuario, es_pregunta_sbom, mensaje)
                prompt_completo = contexto_previo + contexto_proyecto + f"\n\n**Usuario:** {mensaje}"
                
                # ✅ INSTRUCCIONES ESPECÍFICAS SOLO SI ES NECESARIO
                if es_pregunta_sbom:
                    prompt_completo += "\n\n**INSTRUCCIÓN ESPECIAL:** El usuario está preguntando sobre el SBOM analizado. Usa la información específica proporcionada. Si necesitas detalles de vulnerabilidades específicas que no están en el resumen, menciona que puedes proporcionarlos."
                
                print(f"🧠 Enviando mensaje con contexto optimizado a Gemini...")
                print(f"📝 Contexto total: {len(prompt_completo)} caracteres")
                print(f"🔍 Pregunta sobre SBOM: {es_pregunta_sbom}")
                print(f"🎯 Proyecto activo: {proyecto_nombre if proyecto_nombre else 'Ninguno'}")
                
                response = model.generate_content(prompt_completo)
                response_text = response.text
                
            except Exception as e:
                print(f"❌ Error con Gemini: {e}")
                response_text = "Lo siento, hubo un error procesando tu mensaje. ¿Podrías reformular tu pregunta?"
        else:
            response_text = "Servidor de AI temporalmente no disponible. Por favor, intenta más tarde."
        
        # ✅ GUARDAR EN HISTORIAL CON INFORMACIÓN DEL PROYECTO
        if proyecto_id:
            historial_usuario.append(f"Usuario [Proyecto: {proyecto_nombre}]: {mensaje}")
            historial_usuario.append(f"Bot [Con criterios de {proyecto_nombre}]: {response_text}")
        else:
            historial_usuario.append(f"Usuario: {mensaje}")
            historial_usuario.append(f"Bot: {response_text}")
        
        # ✅ MANTENER SOLO LOS ÚLTIMOS 40 INTERCAMBIOS + CONTEXTOS SBOM
        if len(historial_usuario) > 60:  # Aumentado para dar espacio a contextos SBOM
            # Preservar contextos SBOM y mantener últimos intercambios
            contextos_sbom = [entry for entry in historial_usuario if entry.startswith("CONTEXTO_SBOM:")]
            intercambios_normales = [entry for entry in historial_usuario if not entry.startswith("CONTEXTO_SBOM:")]
            
            # Mantener último contexto SBOM + últimos 40 intercambios normales
            historial_filtrado = []
            if contextos_sbom:
                historial_filtrado.append(contextos_sbom[-1])  # Último SBOM
            historial_filtrado.extend(intercambios_normales[-40:])  # Últimos 40 intercambios
            
            historial_conversaciones[user_id] = historial_filtrado
        
        # ✅ RESPUESTA CON INFORMACIÓN ADICIONAL
        response_data = {
            "message": response_text,
            "contexto_proyecto_aplicado": bool(proyecto_id and "error" not in contexto_proyecto.lower()),
            "contexto_sbom_disponible": any(entry.startswith("CONTEXTO_SBOM:") for entry in historial_usuario),
            "es_pregunta_sbom": es_pregunta_sbom,
            "contexto_optimizado": not es_pregunta_sbom,  # Nuevo campo para debug
            "caracteres_contexto": len(prompt_completo) if 'prompt_completo' in locals() else 0,  # Nuevo campo para debug
            "proyecto_info": {
                "id": proyecto_id,
                "nombre": proyecto_nombre
            } if proyecto_id else None
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Error general en chat_mensajes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error interno del servidor"}), 500

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