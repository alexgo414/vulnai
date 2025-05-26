import os
import uuid
import requests
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_cors import CORS
from functools import wraps
import google.generativeai as genai

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

# Configurar Flask
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# Inicializar extensiones
db = SQLAlchemy(app)
api = Api(app)

# CORS configurado para cookies desde el API principal
CORS(app, origins=["http://localhost:5000", "http://localhost:5001"], supports_credentials=True)

# Configurar Gemini
genai.configure(api_key=os.getenv("api_key"))
model = genai.GenerativeModel("gemini-2.0-flash")

historial_conversaciones = {}  # Format: {user_id: {proyecto_id: [mensajes]}}

# ==================== VERIFICACIÓN DE AUTENTICACIÓN ====================
def verify_auth_with_api():
    """Verificar autenticación llamando al API principal"""
    try:
        # Reenviar las cookies al API principal
        cookies = request.cookies
        
        response = requests.get(
            'http://localhost:5001/verify-session',
            cookies=cookies,
            timeout=5
        )
        
        if response.status_code == 200:
            user_data = response.json()
            return user_data
        else:
            return None
            
    except Exception as e:
        print(f"Error verificando autenticación: {e}")
        return None

def auth_required(f):
    """Decorador para rutas que requieren autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_data = verify_auth_with_api()
        if not user_data:
            return jsonify({'error': 'No autorizado'}), 401
        
        # Pasar datos del usuario a la función
        return f(user_data, *args, **kwargs)
    return decorated_function

# ==================== ENDPOINTS DEL CHAT ====================
@app.route('/chat/mensajes', methods=['POST'])
@auth_required
def chat_mensajes(user_data):
    try:
        data = request.get_json()
        message_text = data.get('message', '')
        proyecto_id = data.get('proyecto_id', 'general')
        
        print(f"Mensaje recibido: {message_text} para proyecto: {proyecto_id}")

        # Obtener datos del usuario
        user_id = user_data['user_id']

        # Inicializar estructura si no existe
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = {}
        
        if proyecto_id not in historial_conversaciones[user_id]:
            historial_conversaciones[user_id][proyecto_id] = []

        # Manejar historial de conversaciones por proyecto
        historial = historial_conversaciones[user_id][proyecto_id]
        historial.append(message_text)

        # Generar respuesta con Google Gemini
        try:
            response = model.generate_content(historial)
            response_text = response.text
        except Exception as e:
            print(f"Error con Gemini: {e}")
            response_text = "Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo."

        # Actualizar historial
        historial.append(response_text)
        historial_conversaciones[user_id][proyecto_id] = historial

        return jsonify({
            "message": response_text,
            "proyecto_id": proyecto_id,
            "user_id": user_id
        })
    
    except Exception as e:
        print(f"Error en chat_mensajes: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat/historial/<proyecto_id>', methods=['GET'])
@auth_required
def obtener_historial_proyecto(user_data, proyecto_id):
    try:
        user_id = user_data['user_id']
        
        if user_id in historial_conversaciones and proyecto_id in historial_conversaciones[user_id]:
            historial = historial_conversaciones[user_id][proyecto_id]
        else:
            historial = []
        
        return jsonify({
            "historial": historial, 
            "proyecto_id": proyecto_id,
            "user_id": user_id
        })
    
    except Exception as e:
        print(f"Error obteniendo historial: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat/limpiar/<proyecto_id>', methods=['DELETE'])
@auth_required
def limpiar_historial_proyecto(user_data, proyecto_id):
    try:
        user_id = user_data['user_id']
        
        if user_id in historial_conversaciones and proyecto_id in historial_conversaciones[user_id]:
            historial_conversaciones[user_id][proyecto_id] = []
        
        return jsonify({
            "message": "Historial limpiado",
            "proyecto_id": proyecto_id
        })
    
    except Exception as e:
        print(f"Error limpiando historial: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ==================== ENDPOINT DE SALUD ====================
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "chat"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)