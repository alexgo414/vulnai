import os
import uuid
from datetime import date
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Blueprint, render_template, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
import flask_praetorian
from werkzeug.security import generate_password_hash, check_password_hash
from util import url_has_allowed_host_and_scheme
import random
import google.generativeai as genai

load_dotenv()

chat_blueprint = Blueprint('chat', __name__)
CORS(chat_blueprint)

# Configura la API key
genai.configure(api_key=os.getenv("api_key"))
# Crea una instancia del modelo (por ejemplo, Gemini 2.0 Flash)
model = genai.GenerativeModel("gemini-2.0-flash")

historial_conversaciones = {}

@chat_blueprint.route('/mensajes', methods=['POST'])
@flask_praetorian.auth_required
def chat_mensajes():
    mensajes = [
        "¡Hola! ¿En qué puedo ayudarte hoy?",
        "Recuerda que puedes preguntarme sobre tus proyectos.",
        "¿Necesitas ayuda con algún usuario?",
        "¡Estoy aquí para ayudarte!",
        "¿Quieres saber más sobre tus tareas?"
    ]
    data = request.get_json()
    message_text = data.get('message', '')
    print(f"Mensaje recibido: {message_text}")

    # Si el usuario está autenticado, usa su id; si no, usa una cookie o IP (no recomendado para producción)
    user = flask_praetorian.current_user()
    user_id = str(user.id)

    historial = historial_conversaciones.get(user_id, [])
    historial.append(message_text)

    response = model.generate_content(historial)
    response_text = response.text

    historial.append(response_text)
    historial_conversaciones[user_id] = historial

    return jsonify({"message": response_text})

@chat_blueprint.route('/ping')
def ping():
    return jsonify({"message": "Pong desde el chat"})

__all__ = ["chat_blueprint"]