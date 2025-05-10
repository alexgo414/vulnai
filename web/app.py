import uuid
from flask import Flask, render_template, request, flash, redirect, url_for, abort, make_response
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from util import url_has_allowed_host_and_scheme
import os
from dotenv import load_dotenv
from api.app import api_blueprint, db, login_manager, guard, Usuario

app = Flask(__name__)

# Cargar configuración desde .env
load_dotenv()

# Configurar Flask
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

db.init_app(app)  # inicializa SQLAlchemy con la app principal
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = None
guard.init_app(app, Usuario)

# Crear el user loader
@login_manager.user_loader
def load_user(user_id:str):
    return db.session.get(Usuario, user_id)

# Crear la base de datos y el usuario admin si no existe
with app.app_context():
    db.create_all()

    if not Usuario.query.filter((Usuario.username == 'admin') | (Usuario.email == 'admin@admin.es')).first():
        admin = Usuario(
            id=str(uuid.uuid4()),
            username='admin',
            nombre='admin',
            apellidos='administrador',
            email='admin@admin.es',
            password=guard.hash_password('admin'),
            roles='admin'
        )
        db.session.add(admin)

    if not Usuario.query.filter((Usuario.username == 'user') | (Usuario.email == 'user@user.es')).first():
        user = Usuario(
            id=str(uuid.uuid4()),
            username='user',
            nombre='user',
            apellidos='user',
            email='user@user.es',
            password=guard.hash_password('user'),
            roles='user'
        )
        db.session.add(user)

    db.session.commit()

def check(password, hash): # verificar contraseña
    return check_password_hash(hash, password)

# Ruta para la página inicial
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/perfil')
def perfil():
    return render_template('perfil.html')

# Ruta para la página de chat
@app.route('/chat')
def chat():
    return render_template('chat.html')

# Ruta para la página de login
@app.route('/login',methods=['GET', 'POST'])
def login():
    return render_template('login.html')

@app.route('/perfil/proyecto_nuevo', methods=['GET', 'POST'])
def proyecto_nuevo():
    return render_template('proyecto_nuevo.html')

@app.route('/perfil/proyecto_editar/<string:proyecto_id>', methods=['GET', 'POST'])
def proyecto_editar(proyecto_id):
    return render_template('proyecto_editar.html', proyecto_id=proyecto_id)

@app.route('/perfil/proyecto_eliminar', methods=['GET', 'POST'])
def proyecto_eliminar():
    return render_template('proyecto_eliminar.html')

@app.route('/perfil/usuario_nuevo', methods=['GET', 'POST'])
def usuario_nuevo():
    return render_template('usuario_nuevo.html')

@app.route('/perfil/usuario_editar/<string:usuario_id>', methods=['GET', 'POST'])
def usuario_editar(usuario_id):
    return render_template('usuario_editar.html', usuario_id=usuario_id)

@app.route('/perfil/usuario_eliminar', methods=['GET', 'POST'])
def usuario_eliminar():
    return render_template('usuario_eliminar.html')

# Ruta para logout
@app.route('/logout')
def logout():
    return redirect(url_for('login'))

# Estas importaciones deben estar al final del archivo para evitar problemas en PythonAnywhere
from api.app import api_blueprint
from chat.app import chat_blueprint

app.register_blueprint(api_blueprint, url_prefix="/api")
app.register_blueprint(chat_blueprint, url_prefix="/chat")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)