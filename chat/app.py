import os
import uuid
import json
import time
import xml.etree.ElementTree as ET
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import random
import google.generativeai as genai
import requests
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage


# ✅ CARGAR CONFIGURACIÓN
load_dotenv()

app = Flask(__name__)

# ✅ CONFIGURACIÓN BÁSICA
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "chat-secret-key")
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# ✅ CREAR CARPETA DE UPLOADS
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ✅ CONFIGURAR CORS
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
        return "Eres un experto en ciberseguridad y análisis de SBOM (Software Bill of Materials). Puedes analizar archivos SBOM en formatos JSON, XML, SPDX y YAML."
    
    contexto = "Contexto de la conversación anterior:\n"
    for entrada in historial[-10:]:  # Últimos 10 mensajes
        contexto += f"- {entrada}\n"
    
    contexto += "\nResponde de manera coherente considerando el contexto anterior."
    return contexto

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
    """Procesa SBOM en formato CycloneDX"""
    resultado = {
        'formato': 'CycloneDX',
        'version': data.get('specVersion', 'No especificada'),
        'componentes': [],
        'vulnerabilidades': [],
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
    
    # Procesar vulnerabilidades si existen
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

def generar_prompt_sbom(sbom_data, mensaje_usuario):
    """Genera un prompt específico para análisis de SBOM"""
    
    # ✅ CONSTRUIR EL PROMPT POR PARTES EN LUGAR DE F-STRING LARGO
    prompt_parts = []
    
    # Introducción
    prompt_parts.append("Como experto en ciberseguridad y análisis de SBOM, he recibido un archivo SBOM para análisis.")
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
    
    # Vulnerabilidades (si existen)
    if sbom_data.get('vulnerabilidades'):
        vulnerabilidades = sbom_data['vulnerabilidades']
        prompt_parts.append(f"VULNERABILIDADES DETECTADAS: {len(vulnerabilidades)}")
        
        # Mostrar solo las primeras 5 vulnerabilidades
        for vuln in vulnerabilidades[:5]:
            vuln_id = vuln.get('id', 'Sin ID')
            severidad = vuln.get('severidad', 'Sin severidad')
            prompt_parts.append(f"- {vuln_id}: {severidad}")
        
        if len(vulnerabilidades) > 5:
            prompt_parts.append(f"... y {len(vulnerabilidades) - 5} vulnerabilidades más")
        
        prompt_parts.append("")
    
    # Licencias (si existen)
    resumen = sbom_data.get('resumen', {})
    if resumen.get('licencias_unicas'):
        licencias_todas = resumen['licencias_unicas']
        licencias_mostrar = licencias_todas[:10]  # Primeras 10 licencias
        
        prompt_parts.append(f"LICENCIAS DETECTADAS ({len(licencias_mostrar)} de {len(licencias_todas)}):")
        prompt_parts.append(", ".join(licencias_mostrar))
        prompt_parts.append("")
    
    # Consulta del usuario
    prompt_parts.append(f"CONSULTA DEL USUARIO: {mensaje_usuario}")
    prompt_parts.append("")
    
    # Instrucciones finales
    prompt_parts.append("Por favor, proporciona un análisis detallado basado en la información del SBOM y responde a la consulta específica del usuario.")
    prompt_parts.append("Enfócate en aspectos de seguridad, compliance, licencias y riesgos potenciales.")
    
    # Instrucciones finales con formato
    prompt_parts.append("Por favor, proporciona un análisis detallado basado en la información del SBOM y responde a la consulta específica del usuario.")
    prompt_parts.append("Enfócate en aspectos de seguridad, compliance, licencias y riesgos potenciales.")
    prompt_parts.append("")
    prompt_parts.append("FORMATO DE RESPUESTA:")
    prompt_parts.append("- Usa **negrita** para conceptos importantes")
    prompt_parts.append("- Usa *cursiva* para énfasis")
    prompt_parts.append("- Organiza la información en listas cuando sea apropiado")
    prompt_parts.append("- Usa ### para subtítulos si es necesario")
    prompt_parts.append("- Incluye código con `backticks` para nombres técnicos")

    # ✅ UNIR TODAS LAS PARTES CON SALTOS DE LÍNEA
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

@app.route('/chat/upload-sbom', methods=['POST'])
def upload_sbom():
    """Endpoint para subir y procesar archivos SBOM"""
    try:
        print("🚀 Endpoint /chat/upload-sbom llamado")
        
        # Verificar que se haya enviado un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se ha enviado ningún archivo"}), 400
        
        file = request.files['file']
        mensaje = request.form.get('mensaje', 'Analiza este archivo SBOM')
        
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
            
            # ✅ VALIDAR QUE SEA UN SBOM ANTES DE PROCESAR
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                es_sbom, mensaje_validacion = validar_contenido_sbom(content, filename)
                
                if not es_sbom:
                    # Limpiar archivo
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
                # Limpiar archivo
                try:
                    os.remove(file_path)
                except:
                    pass
                
                return jsonify({
                    "error": f"Error validando el archivo: {str(e)}",
                    "sugerencia": "Verifica que el archivo no esté corrupto y tenga el formato correcto."
                }), 400
            
            # Procesar el archivo SBOM (ya validado)
            sbom_data = procesar_archivo_sbom(file_path, filename)
            print(f"📊 SBOM procesado: {type(sbom_data)}")
            
            # Obtener usuario y historial
            user_id = obtener_usuario_id(request)
            if user_id not in historial_conversaciones:
                historial_conversaciones[user_id] = []
            
            # Generar respuesta con Gemini
            if model and isinstance(sbom_data, dict):
                try:
                    prompt = generar_prompt_sbom(sbom_data, mensaje)
                    print(f"🧠 Enviando análisis SBOM a Gemini...")
                    
                    response = model.generate_content(prompt)
                    response_text = response.text
                    
                except Exception as e:
                    print(f"❌ Error con Gemini: {e}")
                    response_text = f"He procesado tu archivo SBOM ({sbom_data.get('formato', 'formato desconocido')}). Contiene {sbom_data.get('resumen', {}).get('total_componentes', 'un número desconocido de')} componentes. ¿Qué aspecto específico te gustaría analizar?"
            else:
                response_text = f"He recibido y procesado tu archivo SBOM. El análisis muestra: {str(sbom_data)[:200]}... ¿En qué puedo ayudarte con este análisis?"
            
            # Guardar en historial
            historial_usuario = historial_conversaciones[user_id]
            historial_usuario.append(f"Usuario subió SBOM: {filename} - {mensaje}")
            historial_usuario.append(f"Bot: {response_text}")
            
            # Limpiar archivo temporal
            try:
                os.remove(file_path)
            except:
                pass
            
            return jsonify({
                "message": response_text,
                "sbom_info": {
                    "filename": filename,
                    "formato": sbom_data.get('formato', 'Desconocido') if isinstance(sbom_data, dict) else 'Error',
                    "componentes": sbom_data.get('resumen', {}).get('total_componentes', 0) if isinstance(sbom_data, dict) else 0
                },
                "file_processed": True
            }), 200
            
        else:
            return jsonify({"error": "Tipo de archivo no permitido. Formatos soportados: JSON, XML, YAML, SPDX, TXT"}), 400
            
    except Exception as e:
        print(f"❌ Error en upload_sbom: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

@app.route('/chat/mensajes', methods=['POST'])
def chat_mensajes():
    try:
        print("🚀 Endpoint /chat/mensajes llamado")
        
        # ✅ OBTENER ID DEL USUARIO
        user_id = obtener_usuario_id(request)
        print(f"👤 Usuario ID: {user_id}")
        
        # ✅ OBTENER DATOS DEL MENSAJE
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se recibieron datos"}), 400
            
        message_text = data.get('message', '').strip()
        proyecto_id = data.get('proyecto_id', '')
        proyecto_nombre = data.get('proyecto_nombre', '')
        
        print(f"💬 Mensaje recibido: {message_text}")
        print(f"📁 Proyecto: {proyecto_nombre} (ID: {proyecto_id})")

        if not message_text:
            return jsonify({"error": "Mensaje vacío"}), 400

        # 🧠 OBTENER HISTORIAL EXISTENTE PARA ESTE USUARIO
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = []
        
        historial_usuario = historial_conversaciones[user_id]
        
        # ✅ AÑADIR MENSAJE DEL USUARIO AL HISTORIAL
        entrada_usuario = f"Usuario ({proyecto_nombre}): {message_text}"
        historial_usuario.append(entrada_usuario)
        print(f"📝 Historial actualizado. Total mensajes: {len(historial_usuario)}")

        # 🤖 GENERAR RESPUESTA CON CONTEXTO
        if model:
            try:
                # Crear prompt con contexto del historial y proyecto
                contexto_base = f"Eres un experto en ciberseguridad trabajando en el proyecto '{proyecto_nombre}'. Puedes analizar archivos SBOM y brindar asesoramiento en seguridad."
                contexto_historial = formatear_historial_para_ai(historial_usuario)
                prompt_completo = f"{contexto_base}\n\n{contexto_historial}\n\nÚltimo mensaje del usuario sobre el proyecto '{proyecto_nombre}': {message_text}"
                
                print(f"🧠 Enviando contexto a AI: {len(historial_usuario)} mensajes previos")
                response = model.generate_content(prompt_completo)
                response_text = response.text
                print(f"🤖 Respuesta AI: {response_text[:100]}...")
                
            except Exception as e:
                print(f"❌ Error con AI: {e}")
                # Respuesta de fallback con contexto
                if len(historial_usuario) > 1:
                    response_text = f"Recuerdo que estábamos hablando sobre el proyecto '{proyecto_nombre}'. Sobre tu mensaje '{message_text}', ¿puedes darme más detalles?"
                else:
                    response_text = f"Hola! Estoy aquí para ayudarte con el proyecto '{proyecto_nombre}'. Recibí tu mensaje: '{message_text}'. ¿En qué aspectos de ciberseguridad puedo asistirte?"
        else:
            # 🔄 RESPUESTAS INTELIGENTES SIN AI
            if len(historial_usuario) == 1:
                response_text = f"¡Hola! Soy tu asistente de ciberseguridad para el proyecto '{proyecto_nombre}'. Recibí tu mensaje: '{message_text}'. ¿En qué puedo ayudarte? Puedo analizar archivos SBOM y brindar asesoramiento en seguridad."
            else:
                response_text = f"Continuando nuestra conversación sobre '{proyecto_nombre}', sobre '{message_text}', ¿qué específicamente necesitas saber?"

        # 🧠 AÑADIR RESPUESTA DEL BOT AL HISTORIAL
        entrada_bot = f"Bot ({proyecto_nombre}): {response_text}"
        historial_usuario.append(entrada_bot)
        
        # 🗑️ LIMITAR HISTORIAL PARA NO CONSUMIR MUCHA MEMORIA
        if len(historial_usuario) > 50:  # Mantener últimos 50 mensajes
            historial_usuario = historial_usuario[-50:]
            historial_conversaciones[user_id] = historial_usuario
            print(f"🗑️ Historial recortado a {len(historial_usuario)} mensajes")
        
        print(f"✅ Respuesta enviada: {response_text[:50]}...")
        return jsonify({
            "message": response_text,
            "historial_length": len(historial_usuario),
            "user_id": user_id[:10] + "..." if len(user_id) > 10 else user_id,
            "proyecto": proyecto_nombre
        })

    except Exception as e:
        print(f"❌ Error en chat_mensajes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

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