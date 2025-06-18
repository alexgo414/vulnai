import os
import uuid
from datetime import date, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_login import LoginManager, UserMixin
from flask_cors import CORS
import flask_praetorian
from werkzeug.security import generate_password_hash, check_password_hash
from markupsafe import escape

if os.getenv('FLASK_TESTING') == 'true':
    load_dotenv('.env.test')
else:
    load_dotenv()

# Configurar Flask
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS") == "true"
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["PRAETORIAN_HASH_SCHEMES"] = ["pbkdf2_sha256"]
app.config["JWT_ACCESS_LIFESPAN"] = {"hours": 24}
app.config["JWT_REFRESH_LIFESPAN"] = {"days": 30}

app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_TOKEN_LOCATION"] = ["cookies", "headers"]

db = SQLAlchemy(app)

def handle_praetorian_errors(error):
    """Función para manejar errores de Praetorian en Flask-RESTful"""
    error_message = str(error)
    
    if "401" in error_message:
        return {"message": "Token de autenticación requerido"}, 401
    elif "403" in error_message:
        return {"message": "Permisos insuficientes para esta operación"}, 403
    elif "400" in error_message:
        return {"message": "Solicitud incorrecta"}, 400
    else:
        return {"message": "Error de autenticación"}, 401

api = Api(app, errors={
    'MissingToken': {
        'message': "Token de autenticación requerido",
        'status': 401
    },
    'ExpiredAccessError': {
        'message': "Token de autenticación expirado", 
        'status': 401
    },
    'MissingRoleError': {
        'message': "Permisos insuficientes para esta operación",
        'status': 403
    },
    'AuthenticationError': {
        'message': "Error de autenticación",
        'status': 401
    },
    'PraetorianError': {
        'message': "Error de autenticación",
        'status': 401
    }
})

guard = flask_praetorian.Praetorian()

# ✅ CONFIGURAR CORS
CORS(app, 
     origins=["http://localhost:5003"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

login_manager = LoginManager()
login_manager.init_app(app) 
login_manager.login_view = 'login'
login_manager.login_message = None

# Modelos (igual que antes)
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(40), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.Date, nullable=False)
    fecha_modificacion = db.Column(db.Date, nullable=False)
    usuario_id = db.Column(db.String(36), db.ForeignKey('usuarios.id'), nullable=False)

class Usuario(UserMixin, db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    nombre = db.Column(db.String(40), nullable=False)
    apellidos = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    proyectos = db.relationship('Proyecto', backref='propietario', lazy=True)
    roles = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)

    @property
    def identity(self):
        return self.id

    @property
    def rolenames(self):
        try:
            return self.roles.split(",")
        except Exception:
            return []

    @classmethod
    def lookup(cls, username):
        return cls.query.filter_by(username=username).one_or_none()

    @classmethod
    def identify(cls, id):
        return cls.query.get(id)

    def is_valid(self):
        return self.is_active

guard.init_app(app, Usuario)

# ✅ OVERRIDE DEL MÉTODO DE MANEJO DE ERRORES EN API
def custom_handle_error(self, e):
    """Método personalizado para manejar errores de Praetorian"""
    # Verificar si es una excepción de Praetorian
    if isinstance(e, flask_praetorian.exceptions.MissingToken):
        return {"message": "Token de autenticación requerido"}, 401
    elif isinstance(e, flask_praetorian.exceptions.MissingRoleError):
        return {"message": "Permisos insuficientes para esta operación"}, 403
    elif isinstance(e, flask_praetorian.exceptions.ExpiredAccessError):
        return {"message": "Token de autenticación expirado"}, 401
    elif isinstance(e, flask_praetorian.exceptions.AuthenticationError):
        return {"message": "Error de autenticación"}, 401
    elif isinstance(e, flask_praetorian.exceptions.PraetorianError):
        error_message = str(e)
        if "401" in error_message:
            return {"message": "Token de autenticación requerido"}, 401
        elif "403" in error_message:
            return {"message": "Permisos insuficientes para esta operación"}, 403
        else:
            return {"message": "Error de autenticación"}, 401
    
    # Para otros errores, usar el manejo por defecto
    return self._original_handle_error(e)

# ✅ APLICAR EL OVERRIDE
api._original_handle_error = api.handle_error
api.handle_error = lambda e: custom_handle_error(api, e)

@login_manager.user_loader
def load_user(user_id: str):
    return db.session.get(Usuario, user_id)

# Crear base de datos y usuarios por defecto
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
    req = request.get_json(force=True)
    username = req.get("username", None)
    password = req.get("password", None)
    
    try:
        user = guard.authenticate(username, password)
        token = guard.encode_jwt_token(user)

        response = make_response(jsonify({
            "message": "Login exitoso",
            "user": {
                "username": user.username,
                "roles": user.rolenames
            }
        }))
        
        response.set_cookie(
            'access_token',
            token,
            max_age=int(timedelta(hours=24).total_seconds()),
            httponly=True,
            path='/',
            secure=False,
            samesite='Lax'
        )
        
        return response, 200
        
    except Exception as e:
        return jsonify({"message": "Credenciales inválidas"}), 401

@app.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logout exitoso"}))
    response.set_cookie('access_token', '', expires=0)
    return response, 200

@app.route("/usuarios/rol", methods=["GET"])
@flask_praetorian.auth_required
def get_user_role():
    user = flask_praetorian.current_user()
    if user:
        return jsonify({"rol": user.rolenames}), 200
    else:
        return jsonify({"message": "Usuario no autenticado"}), 401

# ✅ RECURSOS RESTful CON MANEJO DE ERRORES MEJORADO
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
        
        if not all(k in data for k in ("username", "nombre", "apellidos", "email", "password")):
            return {"message": "Faltan campos requeridos"}, 400
        
        if Usuario.query.filter_by(username=data["username"]).first() or Usuario.query.filter_by(email=data["email"]).first():
            return {"message": "El nombre de usuario o email ya existe"}, 409
        
        new_user = Usuario(
            id=str(uuid.uuid4()),
            username=escape(data["username"]),
            nombre=escape(data["nombre"]),
            apellidos=escape(data["apellidos"]),
            email=data["email"],
            password=guard.hash_password(data["password"]),
            roles=data.get("roles", "user")
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
            if "admin" in user.rolenames or proyecto.usuario_id == user.id:
                return {
                    "id": proyecto.id,
                    "nombre": proyecto.nombre,
                    "descripcion": proyecto.descripcion,
                    "fecha_creacion": proyecto.fecha_creacion.isoformat(),
                    "fecha_modificacion": proyecto.fecha_modificacion.isoformat(),
                    "usuario_id": proyecto.usuario_id
                }
            else:
                return {"message": "No autorizado"}, 403
        else:
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
        try:
            new_proyecto = Proyecto(
                id=str(uuid.uuid4()),
                nombre=data["nombre"],
                descripcion=data["descripcion"],
                fecha_creacion=date.today(),
                fecha_modificacion=date.today(),
                usuario_id=flask_praetorian.current_user().id
            )
            db.session.add(new_proyecto)
            db.session.commit()
            return {"message": "Proyecto creado con éxito"}, 201
        except Exception as e:
            return {"message": "Error al crear el proyecto"}, 500

    @flask_praetorian.auth_required
    def put(self, proyecto_id):
        proyecto = Proyecto.query.get(proyecto_id)
        if not proyecto:
            return {"message": "Proyecto no encontrado"}, 404
        data = request.json
        proyecto.nombre = data.get("nombre", proyecto.nombre)
        proyecto.descripcion = data.get("descripcion", proyecto.descripcion)
        proyecto.fecha_modificacion = date.today()
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
    mensaje = request.args.get("mensaje", "")
    return f"<h1>{mensaje}</h1>"

# ✅ REGISTRAR RECURSOS
api.add_resource(UsuarioResource, '/usuarios', '/usuarios/<string:user_id>')
api.add_resource(ProyectoResource, '/proyectos', '/proyectos/<string:proyecto_id>')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)