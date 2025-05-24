import os
import uuid
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
import flask_praetorian
from werkzeug.security import generate_password_hash, check_password_hash
from util import url_has_allowed_host_and_scheme
import random
import google.generativeai as genai

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

# Configurar Flask (IGUAL que en la API principal)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["PRAETORIAN_HASH_SCHEMES"] = ["pbkdf2_sha256"]
app.config["JWT_ACCESS_LIFESPAN"] = {"hours": 24}
app.config["JWT_REFRESH_LIFESPAN"] = {"days": 30}

# Inicializar extensiones
db = SQLAlchemy(app)
api = Api(app)
guard = flask_praetorian.Praetorian()
CORS(app, origins=["http://localhost:5003"], supports_credentials=True)

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    nombre = db.Column(db.String(20), nullable=False)
    apellidos = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    roles = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

    @property
    def rolenames(self):
        try:
            return self.roles.split(',')
        except Exception:
            return []

    @classmethod
    def lookup(cls, username):
        return cls.query.filter_by(username=username).one_or_none()

    @classmethod
    def identify(cls, id):
        return cls.query.get(id)

    @property
    def identity(self):
        return self.id

    def is_valid(self):
        return self.is_active

guard.init_app(app, Usuario)

genai.configure(api_key=os.getenv("api_key"))
model = genai.GenerativeModel("gemini-2.0-flash")

historial_conversaciones = {}  # Format: {user_id: {proyecto_id: [mensajes]}}

@app.route('/chat/mensajes', methods=['POST'])
@flask_praetorian.auth_required
def chat_mensajes():
    try:
        data = request.get_json()
        message_text = data.get('message', '')
        proyecto_id = data.get('proyecto_id', 'general')  # 'general' para chat sin proyecto específico
        print(f"Mensaje recibido: {message_text} para proyecto: {proyecto_id}")

        # Obtener usuario autenticado
        user = flask_praetorian.current_user()
        user_id = str(user.id)

        # Inicializar estructura si no existe
        if user_id not in historial_conversaciones:
            historial_conversaciones[user_id] = {}
        
        if proyecto_id not in historial_conversaciones[user_id]:
            historial_conversaciones[user_id][proyecto_id] = []

        # Manejar historial de conversaciones por proyecto
        historial = historial_conversaciones[user_id][proyecto_id]
        historial.append(message_text)

        # Generar respuesta con Google Gemini
        response = model.generate_content(historial)
        response_text = response.text

        # Actualizar historial
        historial.append(response_text)
        historial_conversaciones[user_id][proyecto_id] = historial

        return jsonify({
            "message": response_text,
            "proyecto_id": proyecto_id
        })
    
    except Exception as e:
        print(f"Error en chat_mensajes: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/chat/historial/<proyecto_id>', methods=['GET'])
@flask_praetorian.auth_required
def obtener_historial_proyecto(proyecto_id):
    try:
        user = flask_praetorian.current_user()
        user_id = str(user.id)
        
        if user_id in historial_conversaciones and proyecto_id in historial_conversaciones[user_id]:
            historial = historial_conversaciones[user_id][proyecto_id]
        else:
            historial = []
        
        return jsonify({"historial": historial, "proyecto_id": proyecto_id})
    
    except Exception as e:
        print(f"Error obteniendo historial: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)