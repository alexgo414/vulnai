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

app = Flask(__name__)
CORS(app)

# Configura la API key
genai.configure(api_key=os.getenv("api_key"))
# Crea una instancia del modelo (por ejemplo, Gemini 1.5 Flash)
model = genai.GenerativeModel("gemini-1.5-flash")

@app.route('/chat/mensajes', methods=['POST'])
def chat_mensajes():
    mensajes = [
        "¡Hola! ¿En qué puedo ayudarte hoy?",
        "Recuerda que puedes preguntarme sobre tus proyectos.",
        "¿Necesitas ayuda con algún usuario?",
        "¡Estoy aquí para ayudarte!",
        "¿Quieres saber más sobre tus tareas?"
    ]
    # Puedes usar el mensaje recibido si lo necesitas:
    data = request.get_json()
    message_text = data.get('message', '')
    print(f"Mensaje recibido: {message_text}")

    # Genera la descripción
    response = model.generate_content([message_text])
    response_text = response.text  # Extraer el texto generado
    
    return jsonify({"message": response_text})