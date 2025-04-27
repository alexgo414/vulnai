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

def hash(password): # codificar contraseña
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

def check(password, hash): # verificar contraseña
    return check_password_hash(hash, password)

# Definición de modelos
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.Date, nullable=False)
    fecha_modificacion = db.Column(db.Date, nullable=False)
    usuario_id = db.Column(db.String(36), db.ForeignKey('usuarios.id'), nullable=False)  # Relación con Usuario

class Usuario(UserMixin, db.Model): # Se añade UserMixin porque así lo manda Flask-Login
    __tablename__ = 'usuarios'
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    nombre = db.Column(db.String(20), nullable=False)
    apellidos = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    proyectos = db.relationship('Proyecto', backref='propietario', lazy=True)  # Relación con Proyecto

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
            password=hash('admin')
        )
        db.session.add(admin)

    if not Usuario.query.filter((Usuario.username == 'user') | (Usuario.email == 'user@user.es')).first():
        user = Usuario(
            id=str(uuid.uuid4()),
            username='user',
            nombre='user',
            apellidos='user',
            email='user@user.es',
            password=hash('user')
        )
        db.session.add(user)

    db.session.commit()


# Ruta para la página inicial
@app.route('/')
def index():
    return render_template('index.html')

# Ruta para la página de chat
@app.route('/chat')
def chat():
    return render_template('chat.html')

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

# Ruta para logout
@app.route('/logout')
@login_required
def logout():
    logout_user()  # Cerrar sesión con Flask-Login
    flash('Has cerrado la sesión.', 'info')
    return redirect(url_for('login'))

# Ruta para la página de crear proyecto
@app.route('/perfil/proyecto_nuevo', methods=['GET', 'POST'])
@login_required
def proyecto_nuevo():
    if request.method == "POST":
        try:
            # Generar un ID único automáticamente
            id = str(uuid.uuid4())

            # Obtener los datos del formulario
            nombre = request.form['nombre']
            descripcion = request.form['descripcion']
            fecha_creacion = date.today()
            fecha_modificacion = fecha_creacion

            # Validar el nombre del proyecto
            if len(nombre) > 20:
                flash("El nombre del proyecto no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("proyecto_nuevo"))

            # Crear el proyecto
            p = Proyecto(
                id=id,
                nombre=nombre,
                descripcion=descripcion,
                fecha_creacion=fecha_creacion,
                fecha_modificacion=fecha_modificacion,
                propietario=current_user
            )

            # Guardar el nuevo proyecto en la base de datos
            db.session.add(p)
            db.session.commit()
            flash(f"Proyecto <strong>{nombre}</strong> añadido con éxito.", "success")
            return redirect(url_for("perfil"))

        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error al crear el proyecto: {e}")
            flash("Ocurrió un error al crear el proyecto.", "danger")
            return redirect(url_for("proyecto_nuevo"))

    return render_template("proyecto_nuevo.html")

# Ruta para la página de editar proyecto  
@app.route("/perfil/proyecto_editar/<string:id>", methods=["GET", "POST"])
@login_required
def proyecto_editar(id=None):
    p = db.one_or_404(db.select(Proyecto).where(Proyecto.id == id))
    if request.method == "POST":
        try:
            nombre = request.form['nombre']
            descripcion = request.form['descripcion']

            # Validar el límite de caracteres para el nombre del proyecto
            if len(nombre) > 20:
                flash("El nombre del proyecto no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("proyecto_editar", id=id))

            # Actualizar los datos del proyecto
            p.nombre = nombre
            p.descripcion = descripcion
            p.fecha_modificacion = date.today()

            db.session.commit()
            flash(f"Proyecto <strong>{p.nombre}</strong> modificado con éxito.", "success")
            return redirect(url_for("perfil"))

        except Exception as e:
            db.session.rollback()  # Revertir los cambios en caso de error
            app.logger.error(f"Error al editar el proyecto: {e}")
            flash("Ocurrió un error al editar el proyecto.", "danger")
            return redirect(url_for("proyecto_editar", id=id))
    else:
        return render_template("proyecto_editar.html", proyecto=p)

# Ruta para eliminar un proyecto
@app.route("/proyecto_eliminar/<string:id>")
@login_required
def proyecto_eliminar(id=None):
    p = db.one_or_404(db.select(Proyecto).where(Proyecto.id == id))
    db.session.delete(p)
    db.session.commit()
    flash(f"Proyecto <strong>{p.nombre}</strong> eliminado con éxito.", "success")
    return redirect(url_for("perfil"))

# Ruta para crear un nuevo usuario
@app.route('/perfil/usuario_nuevo', methods=['GET', 'POST'])
@login_required
def usuario_nuevo():
    if request.method == "POST":
        try:
            # Generar un ID único automáticamente
            id = str(uuid.uuid4())

            # Obtener los datos del formulario
            username = request.form['username']
            nombre = request.form['nombre']
            apellidos = request.form['apellidos']
            email = request.form['email']

            # Validar límites de caracteres
            if len(username) > 20:
                flash("El nombre de usuario no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("usuario_nuevo"))
            if len(nombre) > 20:
                flash("El nombre no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("usuario_nuevo"))
            if len(apellidos) > 50:
                flash("Los apellidos no pueden exceder los 50 caracteres.", "danger")
                return redirect(url_for("usuario_nuevo"))
            if len(email) > 50:
                flash("El email no puede exceder los 50 caracteres.", "danger")
                return redirect(url_for("usuario_nuevo"))

            # Obtener la contraseña y encriptarla
            password = request.form['password']
            hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

            # Crear el usuario
            u = Usuario(
                id=id,
                username=username,
                nombre=nombre,
                apellidos=apellidos,
                email=email,
                password=hashed_password,
                proyectos=''
            )

            # Guardar el nuevo usuario en la base de datos
            db.session.add(u)
            db.session.commit()
            flash(f"Usuario <strong>{nombre}</strong> añadido con éxito.", "success")
            return redirect(url_for("perfil"))

        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error al crear el usuario: {e}")
            flash("Ocurrió un error al crear el usuario.", "danger")
            return redirect(url_for("usuario_nuevo"))
    else:
        return render_template("usuario_nuevo.html")
    
# Ruta para la página de editar usuario
@app.route("/perfil/usuario_editar/<string:id>", methods=["GET", "POST"])
@login_required
def usuario_editar(id=None):
    u = db.one_or_404(db.select(Usuario).where(Usuario.id == id))
    if request.method == "POST":
        try:
            # Obtener los datos del formulario
            username = request.form['username']
            nombre = request.form['nombre']
            apellidos = request.form['apellidos']
            email = request.form['email']
            password = request.form['password']

            # Validar límites de caracteres
            if len(username) > 20:
                flash("El nombre de usuario no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("usuario_editar", id=id))
            if len(nombre) > 20:
                flash("El nombre no puede exceder los 20 caracteres.", "danger")
                return redirect(url_for("usuario_editar", id=id))
            if len(apellidos) > 50:
                flash("Los apellidos no pueden exceder los 50 caracteres.", "danger")
                return redirect(url_for("usuario_editar", id=id))
            if len(email) > 50:
                flash("El email no puede exceder los 50 caracteres.", "danger")
                return redirect(url_for("usuario_editar", id=id))

            # Actualizar los datos del usuario
            u.username = username
            u.nombre = nombre
            u.apellidos = apellidos
            u.email = email

            # Actualizar la contraseña solo si se proporciona
            if password:
                hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
                u.password = hashed_password

            db.session.commit()
            flash(f"Usuario <strong>{u.nombre}</strong> modificado con éxito.", "success")
            return redirect(url_for("perfil"))

        except Exception as e:
            db.session.rollback()  # Revertir los cambios en caso de error
            app.logger.error(f"Error al editar el usuario: {e}")
            flash("Ocurrió un error al editar el usuario.", "danger")
            return redirect(url_for("usuario_editar", id=id))
    else:
        return render_template("usuario_editar.html", usuario=u)

# Ruta para eliminar un usuario
# Ruta para eliminar un usuario
@app.route("/usuario_eliminar/<string:id>")
@login_required
def usuario_eliminar(id=None):
    u = db.one_or_404(db.select(Usuario).where(Usuario.id == id))

    # Verificar si el usuario es 'admin'
    if u.username == 'admin':
        flash("No se puede eliminar el usuario administrador.", "danger")
        return redirect(url_for("perfil"))

    # Proceder con la eliminación si no es 'admin'
    db.session.delete(u)
    db.session.commit()
    flash(f"Usuario <strong>{u.nombre}</strong> eliminado con éxito.", "success")
    return redirect(url_for("perfil"))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)