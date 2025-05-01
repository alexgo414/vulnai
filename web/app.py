import uuid
from flask import Flask, render_template, request, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from util import url_has_allowed_host_and_scheme
import os
from dotenv import load_dotenv

app = Flask(__name__)

# Cargar configuración desde .env
load_dotenv()

# Configurar Flask
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

db = SQLAlchemy()
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Debes iniciar sesión para acceder a esta página.'
login_manager.login_message_category = 'info'

# Modelos
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.Date, nullable=False)
    fecha_modificacion = db.Column(db.Date, nullable=False)
    usuario_id = db.Column(db.String(36), db.ForeignKey('usuarios.id'), nullable=False)

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    nombre = db.Column(db.String(20), nullable=False)
    apellidos = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    proyectos = db.relationship('Proyecto', backref='propietario', lazy=True)

def check(password, hash): # verificar contraseña
    return check_password_hash(hash, password)

# Crear el user loader
@login_manager.user_loader
def load_user(user_id:str):
    return db.session.get(Usuario, user_id) # Poner que devuelva None si no existe el usuario??

# Ruta para la página inicial
@app.route('/')
def index():
    return render_template('index.html')

# Ruta para la página del perfil de usuario
@app.route('/perfil')
@login_required
def perfil():
    if current_user.nombre == 'admin':
        proyectos = db.session.execute(db.select(Proyecto)).scalars().all()
        usuarios = db.session.execute(db.select(Usuario)).scalars().all()
        return render_template('perfil_admin.html', proyectos=proyectos, usuarios=usuarios)
    else:
        # Obtener los proyectos directamente desde la relación
        proyectos = current_user.proyectos  # Esto ya es una lista de objetos Proyecto
        return render_template('perfil_usuario.html', proyectos=proyectos, usuario=current_user)

# Ruta para la página de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']       
        user = Usuario.query.filter_by(username=username).first()
        if user and check(password, user.password):
            login_user(user, remember=True)  # Flask-Login
            flash('Has iniciado sesión correctamente.', 'success')
            next = request.form.get('next', '/perfil') 
            if not url_has_allowed_host_and_scheme(next, request.host):
                return abort(400)                
            return redirect(next)
        else:
            flash('Nombre de usuario o contraseña incorrectos.', 'danger')    
    
    # Crear una respuesta personalizada para deshabilitar el caché
    # Esto permite no volver a cargar la página de login si el usuario ya ha iniciado sesión
    response = make_response(render_template('login.html'))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Ruta para la página de chat
@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/perfil/proyecto_nuevo', methods=['GET', 'POST'])
@login_required
def proyecto_nuevo():
    return render_template('proyecto_nuevo.html')

@app.route('/perfil/proyecto_editar', methods=['GET', 'POST'])
@login_required
def proyecto_editar():
    return render_template('proyecto_editar.html')

@app.route('/perfil/proyecto_eliminar', methods=['GET', 'POST'])
@login_required
def proyecto_eliminar():
    return render_template('proyecto_eliminar.html')

@app.route('/perfil/usuario_nuevo', methods=['GET', 'POST'])
@login_required
def usuario_nuevo():
    return render_template('usuario_nuevo.html')

@app.route('/perfil/usuario_editar', methods=['GET', 'POST'])
@login_required
def usuario_editar():
    return render_template('usuario_editar.html')

@app.route('/perfil/usuario_eliminar', methods=['GET', 'POST'])
@login_required
def usuario_eliminar():
    return render_template('usuario_eliminar.html')


# Ruta para logout
@app.route('/logout')
@login_required
def logout():
    logout_user()  # Cerrar sesión con Flask-Login
    flash('Has cerrado la sesión.', 'info')
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)