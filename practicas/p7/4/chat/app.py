import os
import uuid
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import random
import google.generativeai as genai
import requests

# ✅ CARGAR CONFIGURACIÓN
load_dotenv()

app = Flask(__name__)

# ✅ CONFIGURACIÓN BÁSICA
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "chat-secret-key")

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

def obtener_usuario_id(request):
    """
    Obtiene un ID único para el usuario actual
    Por ahora usamos la IP, pero puedes mejorarlo con autenticación
    """
    # Opción 2: Si tuvieras autenticación, podrías usar:
    user_id = request.cookies.get('username', 'anonymous')
    
    return user_id

def formatear_historial_para_ai(historial):
    """
    Convierte el historial en un formato que entienda la AI
    """
    if not historial:
        return "Eres un asistente virtual útil y amigable."
    
    contexto = "Contexto de la conversación anterior:\n"
    for entrada in historial[-10:]:  # Últimos 10 mensajes
        contexto += f"- {entrada}\n"
    
    contexto += "\nResponde de manera coherente considerando el contexto anterior."
    return contexto

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
        print(f"💬 Mensaje recibido: {message_text}")

        if not message_text:
            return jsonify({"error": "Mensaje vacío"}), 400

        # 🧠 OBTENER HISTORIAL EXISTENTE PARA ESTE USUARIO
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = []
        
        historial_usuario = historial_conversaciones[user_id]
        
        # ✅ AÑADIR MENSAJE DEL USUARIO AL HISTORIAL
        entrada_usuario = f"Usuario: {message_text}"
        historial_usuario.append(entrada_usuario)
        print(f"📝 Historial actualizado. Total mensajes: {len(historial_usuario)}")

        # 🤖 GENERAR RESPUESTA CON CONTEXTO
        if model:
            try:
                # Crear prompt con contexto del historial
                contexto = formatear_historial_para_ai(historial_usuario)
                prompt_completo = f"{contexto}\n\nÚltimo mensaje del usuario: {message_text}"
                
                print(f"🧠 Enviando contexto a AI: {len(historial_usuario)} mensajes previos")
                response = model.generate_content(prompt_completo)
                response_text = response.text
                print(f"🤖 Respuesta AI: {response_text[:100]}...")
                
            except Exception as e:
                print(f"❌ Error con AI: {e}")
                # Respuesta de fallback con contexto
                if len(historial_usuario) > 1:
                    response_text = f"Recuerdo que estábamos hablando. Sobre tu mensaje '{message_text}', ¿puedes darme más detalles?"
                else:
                    response_text = f"Hola! Recibí tu mensaje: '{message_text}'. ¿En qué puedo ayudarte?"
        else:
            # 🔄 RESPUESTAS INTELIGENTES SIN AI
            if len(historial_usuario) == 1:
                response_text = f"¡Hola! Soy tu asistente virtual. Recibí tu mensaje: '{message_text}'. ¿En qué puedo ayudarte?"
            else:
                # Buscar patrones en el historial
                mensajes_previos = [msg for msg in historial_usuario if msg.startswith("Usuario:")]
                if len(mensajes_previos) > 1:
                    response_text = f"Recuerdo nuestra conversación. Sobre '{message_text}', puedo ayudarte basándome en lo que hemos hablado antes."
                else:
                    response_text = f"Continuando nuestra conversación, sobre '{message_text}', ¿qué específicamente necesitas saber?"

        # 🧠 AÑADIR RESPUESTA DEL BOT AL HISTORIAL
        entrada_bot = f"Bot: {response_text}"
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
            "user_id": user_id[:10] + "..." if len(user_id) > 10 else user_id
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
            "total_mensajes": total_mensajes
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "Servidor de Chat SVAIA - Con Memoria",
        "endpoints": ["/chat/mensajes", "/chat/historial", "/chat/limpiar", "/health"],
        "status": "running",
        "version": "4.0",
        "features": ["memoria_conversacion", "contexto_ai", "historial_persistente"]
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5002, debug=True)