import os
import uuid
from datetime import date, datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, flash, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
import flask_praetorian
from werkzeug.security import generate_password_hash, check_password_hash
from util import url_has_allowed_host_and_scheme

# Cargar configuración desde .env
load_dotenv()

# Configurar Flask
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["PRAETORIAN_HASH_SCHEMES"] = ["pbkdf2_sha256"]
app.config["JWT_ACCESS_LIFESPAN"] = {"hours": 24}
app.config["JWT_REFRESH_LIFESPAN"] = {"days": 30}

db = SQLAlchemy(app)
api = Api(app)
guard = flask_praetorian.Praetorian()
CORS(app, supports_credentials=True, origins=["http://localhost:5003"])

login_manager = LoginManager()
login_manager.init_app(app) 
login_manager.login_view = 'login'
login_manager.login_message = None

# Modelos
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False)
    fecha_modificacion = db.Column(db.DateTime, nullable=False)
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
    roles = db.Column(db.Text)  # Necesario para Praetorian
    is_active = db.Column(db.Boolean, default=True)

    @property
    def identity(self):
        """
        *Required Attribute or Property*

        flask-praetorian requires that the user class has an ``identity`` instance
        attribute or property that provides the unique id of the user instance
        """
        return self.id

    @property
    def rolenames(self):
        """
        *Required Attribute or Property*

        flask-praetorian requires that the user class has a ``rolenames`` instance
        attribute or property that provides a list of strings that describe the roles
        attached to the user instance
        """
        try:
            return self.roles.split(",")
        except Exception:
            return []

    @classmethod
    def lookup(cls, username):
        """
        *Required Method*

        flask-praetorian requires that the user class implements a ``lookup()``
        class method that takes a single ``username`` argument and returns a user
        instance if there is one that matches or ``None`` if there is not.
        """
        return cls.query.filter_by(username=username).one_or_none()

    @classmethod
    def identify(cls, id):
        """
        *Required Method*

        flask-praetorian requires that the user class implements an ``identify()``
        class method that takes a single ``id`` argument and returns user instance if
        there is one that matches or ``None`` if there is not.
        """
        return cls.query.get(id)

    def is_valid(self):
        return self.is_active

guard.init_app(app, Usuario)

def check(password, hash): # verificar contraseña
    return check_password_hash(hash, password)

def hash_password(password):
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

# Crear el user loader
@login_manager.user_loader
def load_user(user_id:str):
    return db.session.get(Usuario, user_id) # Poner que devuelva None si no existe el usuario??

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


@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        user = guard.authenticate(username, password)
        if user:
            access_token = guard.encode_jwt_token(user)
            response = make_response(jsonify({"message": "Inicio de sesión exitoso"}), 200)
            response.set_cookie("access_token", access_token, httponly=True, samesite='Lax')
            print("Inicio de sesión exitoso para el usuario:", username)
            return response
        else:
            return jsonify({"message": "Credenciales inválidas"}), 401
    except Exception as e:
        # Esto te ayudará a ver el error real en el frontend y en el log
        print("Error en /login:", str(e))
        return jsonify({"error": str(e)}), 500

# Agregar esta ruta si no existe
@app.route("/logout", methods=["GET", "POST"])
def logout():
    try:
        # Limpiar la sesión
        response = make_response(redirect("/login"))
        
        # Eliminar todas las cookies relacionadas con la sesión
        response.set_cookie('session', '', expires=0)
        response.set_cookie('access_token', '', expires=0)
        response.set_cookie('refresh_token', '', expires=0)
        
        # Si usas Flask-Login
        if hasattr(current_user, 'is_authenticated'):
            logout_user()
        
        flash("Sesión cerrada correctamente", "success")
        return response
        
    except Exception as e:
        print(f"Error en logout: {e}")
        response = make_response(redirect("/login"))
        response.set_cookie('session', '', expires=0)
        return response
    
@app.route("/perfil/datos", methods=["GET"])
@flask_praetorian.auth_required
def get_perfil_datos():
    """
    Endpoint para obtener los datos del perfil del usuario actual.
    Devuelve los proyectos y usuarios si el usuario es admin.
    """
    user = flask_praetorian.current_user()
    
    # Obtener proyectos
    proyectos = [{
        "id": p.id,
        "nombre": p.nombre,
        "descripcion": p.descripcion,
        "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
        "fecha_modificacion": p.fecha_modificacion.isoformat() if p.fecha_modificacion else None,
        "usuario_id": p.usuario_id
    } for p in Proyecto.query.all()]
    
    # Obtener usuarios solo si es admin
    usuarios = []
    if "admin" in user.rolenames:
        usuarios = [{
            "id": u.id,
            "username": u.username,
            "nombre": u.nombre,
            "apellidos": u.apellidos,
            "email": u.email,
            "roles": u.roles
        } for u in Usuario.query.all()]
    
    return jsonify({
        "rol": user.rolenames,
        "proyectos": proyectos,
        "usuarios": usuarios,
        "usuario_actual": {
            "id": user.id,
            "username": user.username,
            "nombre": user.nombre,
            "apellidos": user.apellidos,
            "email": user.email,
            "roles": user.roles
        }
    }), 200

# Recursos RESTful
class UsuarioResource(Resource):
    @flask_praetorian.auth_required
    def get(self, user_id=None):
        if user_id:
            user = Usuario.query.get(user_id)
            if not user:
                return {"message": "Usuario no encontrado"}, 404
            return {
                "id": user.id,
                "username": user.username,
                "nombre": user.nombre,
                "apellidos": user.apellidos,
                "email": user.email
            }
        else:
            users = Usuario.query.all()
            return [
                {
                    "id": user.id,
                    "username": user.username,
                    "nombre": user.nombre,
                    "apellidos": user.apellidos,
                    "email": user.email
                }
                for user in users
            ]

    @flask_praetorian.roles_required('admin')
    def post(self):
        data = request.json
        new_user = Usuario(
            id=str(uuid.uuid4()),
            username=data["username"],
            nombre=data["nombre"],
            apellidos=data["apellidos"],
            email=data["email"],
            password=guard.hash_password(data["password"]),
            roles=data.get("roles", "user")  # Asignar rol por defecto como 'user'
        )
        db.session.add(new_user)
        db.session.commit()
        return {"message": "Usuario creado con éxito"}, 201

    def put(self, user_id):
        try:
            user = Usuario.query.get(user_id)
            if not user:
                return {"message": "Usuario no encontrado"}, 404
            data = request.json
            user.username = data.get("username", user.username)
            user.nombre = data.get("nombre", user.nombre)
            user.apellidos = data.get("apellidos", user.apellidos)
            user.email = data.get("email", user.email)
            if "password" in data:
                user.password = guard.hash_password(data["password"])
            db.session.commit()
            return {"message": "Usuario actualizado con éxito"}
        except Exception as e:
            print("Error en PUT /usuarios/<user_id>:", str(e))
            return {"message": f"Error interno: {str(e)}"}, 500

    @flask_praetorian.roles_required('admin')
    def delete(self, user_id):
        user = Usuario.query.get(user_id)
        if not user:
            return {"message": "Usuario no encontrado"}, 404
        if user.username == "admin":
            return {"message": "No se puede eliminar el usuario administrador"}, 403
        if user.proyectos and len(user.proyectos) > 0:
            return {"message": "No se puede eliminar el usuario porque tiene proyectos asociados."}, 400
        db.session.delete(user)
        db.session.commit()
        return {"message": "Usuario eliminado con éxito"}

class ProyectoResource(Resource):
    @flask_praetorian.auth_required
    def get(self, proyecto_id=None):
        user = flask_praetorian.current_user()
        if proyecto_id:
            proyecto = Proyecto.query.get(proyecto_id)
            if not proyecto:
                return {"message": "Proyecto no encontrado"}, 404
            # Solo permite ver el proyecto si es admin o propietario
            if "admin" in user.rolenames or proyecto.usuario_id == user.id:
                return {
                    "id": proyecto.id,
                    "nombre": proyecto.nombre,
                    "descripcion": proyecto.descripcion,
                    "fecha_creacion": proyecto.fecha_creacion.isoformat() if proyecto.fecha_creacion else None,
                    "fecha_modificacion": proyecto.fecha_modificacion.isoformat() if proyecto.fecha_modificacion else None,
                    "usuario_id": proyecto.usuario_id
                }
            else:
                return {"message": "No autorizado"}, 403
        else:
            # Si es admin, ve todos; si no, solo los suyos
            if "admin" in user.rolenames:
                proyectos = Proyecto.query.all()
            else:
                proyectos = Proyecto.query.filter_by(usuario_id=user.id).all()
            return [
                {
                    "id": proyecto.id,
                    "nombre": proyecto.nombre,
                    "descripcion": proyecto.descripcion,
                    "fecha_creacion": proyecto.fecha_creacion.isoformat(),
                    "fecha_modificacion": proyecto.fecha_modificacion.isoformat(),
                    "usuario_id": proyecto.usuario_id
                }
                for proyecto in proyectos
            ]

    @flask_praetorian.auth_required
    def post(self):
        data = request.json
        print("Datos recibidos:", data)  # Verificar los datos recibidos

        try:
            # Crear el proyecto directamente
            new_proyecto = Proyecto(
                id=str(uuid.uuid4()),
                nombre=data["nombre"],
                descripcion=data["descripcion"],
                fecha_creacion=datetime.now(),
                fecha_modificacion=datetime.now(),
                usuario_id=flask_praetorian.current_user().id
            )
            db.session.add(new_proyecto)
            db.session.commit()
            return {"message": "Proyecto creado con éxito"}, 201
        except Exception as e:
            print("Error al guardar el proyecto:", str(e))
            return {"message": "Error al crear el proyecto"}, 500

    @flask_praetorian.auth_required
    def put(self, proyecto_id):
        proyecto = Proyecto.query.get(proyecto_id)
        if not proyecto:
            return {"message": "Proyecto no encontrado"}, 404
        data = request.json
        proyecto.nombre = data.get("nombre", proyecto.nombre)
        proyecto.descripcion = data.get("descripcion", proyecto.descripcion)
        proyecto.fecha_modificacion = datetime.now()
        db.session.commit()
        return {"message": "Proyecto actualizado con éxito"}

    @flask_praetorian.auth_required
    def delete(self, proyecto_id):
        proyecto = Proyecto.query.get(proyecto_id)
        if not proyecto:
            return {"message": "Proyecto no encontrado"}, 404
        db.session.delete(proyecto)
        db.session.commit()
        return {"message": "Proyecto eliminado con éxito"}

@app.route("/reflejar")
def reflejar():
    """
    Endpoint de prueba para permitir ataques Reflected XSS.
    """
    mensaje = request.args.get("mensaje", "")
    return f"<h1>{mensaje}</h1>"

# Rutas de la API
api.add_resource(UsuarioResource, '/usuarios', '/usuarios/<string:user_id>')
api.add_resource(ProyectoResource, '/proyectos', '/proyectos/<string:proyecto_id>')

# Crear la base de datos
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)