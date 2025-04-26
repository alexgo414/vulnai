import toml
import uuid
from flask import Flask, render_template, request, flash, redirect, url_for, abort
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, func
from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from util import url_has_allowed_host_and_scheme

app = Flask(__name__)
app.config.from_file("config.toml", load=toml.load)
app.secret_key = app.config['SECRET_KEY']

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

def buscar_usuario_por_id_proyecto(id_proyecto):
    # Obtener el proyecto por su ID
    proyecto = db.session.execute(db.select(Proyecto).where(Proyecto.id == id_proyecto)).scalar_one_or_none()
    if proyecto:
        # Obtener el nombre del usuario que tiene asignado el proyecto
        usuario = db.session.execute(db.select(Usuario).where(Usuario.proyectos.contains(id_proyecto))).scalar_one_or_none()
        if usuario:
            return usuario.nombre
    return None

# Definición de modelos
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.Date, nullable=False)
    fecha_modificacion = db.Column(db.Date, nullable=False)

class Usuario(UserMixin, db.Model): # Se añade UserMixin porque así lo manda Flask-Login
    __tablename__ = 'usuarios'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    apellidos = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    proyectos = db.Column(db.Text, nullable=True)  # Almacenar IDs de proyectos como una lista separada por comas

# Crear el user loader
@login_manager.user_loader
def load_user(user_id:str):
    return db.session.get(Usuario, user_id) # Poner que devuelva None si no existe el usuario??

# Crear la base de datos y el usuario admin si no existe
with app.app_context():
    db.create_all()

    if not Usuario.query.filter_by(email='admin').first():
        admin = Usuario(
            id=str(uuid.uuid4()),
            nombre='admin',
            apellidos='administrador',
            email='admin',
            password=hash('admin')
        )
        db.session.add(admin)

    if not Usuario.query.filter_by(email='user').first():
        user = Usuario(
            id=str(uuid.uuid4()),
            nombre='user',
            apellidos='user',
            email='user',
            password=hash('user'),
            proyectos=''
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

@app.template_filter('buscar_usuario')
def buscar_usuario(id_proyecto):
    return buscar_usuario_por_id_proyecto(id_proyecto)

# Ruta para la página del perfil de usuario
@app.route('/perfil')
@login_required
def perfil():
    if current_user.email == 'admin':
        proyectos = db.session.execute(db.select(Proyecto)).scalars().all()
        usuarios = db.session.execute(db.select(Usuario)).scalars().all()
        return render_template('perfil.html', proyectos=proyectos, usuarios=usuarios)
    else:
        proyectos_ids = current_user.proyectos.split(",") if current_user.proyectos else []
        proyectos = Proyecto.query.filter(Proyecto.id.in_(proyectos_ids)).all()
        return render_template('perfil_usuario.html', proyectos=proyectos, usuario=current_user)

# Ruta para la página de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']       
        user = Usuario.query.filter_by(email=email).first()
        if user and check(password, user.password):
            login_user(user, remember=True)  # Flask-Login
            flash('Has iniciado sesión correctamente.', 'success')
            next = request.form.get('next', '/perfil') 
            if not url_has_allowed_host_and_scheme(next, request.host):
                return abort(400)                
            return redirect(next)
        else:
            flash('Nombre de usuario o contraseña incorrectos.', 'danger')    
    return render_template('login.html')

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
        # Generar un ID único automáticamente
        id = str(uuid.uuid4())

        # Obtener los datos del formulario
        nombre = request.form['nombre']
        descripcion = request.form['descripcion']
        fecha_creacion = date.today().strftime("%Y-%m-%d")
        if fecha_creacion != date.today().strftime("%Y-%m-%d"):
            fecha_modificacion = date.today().strftime("%Y-%m-%d")
        else:
            fecha_modificacion = fecha_creacion

        p = Proyecto(id=id, nombre=nombre, descripcion=descripcion, fecha_creacion=fecha_creacion, fecha_modificacion=fecha_modificacion)
        
        # Guardar el nuevo proyecto en la base de datos
        db.session.add(p)

        # Guardar el ID del proyecto en el usuario actual
        if current_user.proyectos:
            current_user.proyectos += f",{id}"  # Agregar el nuevo ID a la lista existente
        else:
            current_user.proyectos = id  # Si no hay proyectos, inicializar con el nuevo ID

        db.session.commit()
        flash(f"Proyecto <strong>{nombre}</strong> añadido con éxito.", "success")
        return redirect(url_for("perfil"))
    else:
        return render_template("proyecto_nuevo.html")

# Ruta para la página de editar proyecto  
@app.route("/perfil/proyecto_editar/<string:id>", methods=["GET", "POST"])
@login_required
def proyecto_editar(id=None):
    p = db.one_or_404(db.select(Proyecto).where(Proyecto.id == id))
    if request.method == "POST":
        p.nombre = request.form['nombre']
        p.descripcion = request.form['descripcion']
        p.fecha_modificacion = date.today()
        db.session.commit()
        flash(f"Proyecto <strong>{p.nombre}</strong> modificado con éxito.", "success")
        return redirect(url_for("perfil"))
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
        # Generar un ID único automáticamente
        id = str(uuid.uuid4())

        # Obtener los datos del formulario
        nombre = request.form['nombre']
        apellidos = request.form['apellidos']
        email = request.form['email']

        # Obtener la contraseña y encriptarla
        password = request.form['password']
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

        u = Usuario(id=id, nombre=nombre, apellidos=apellidos, email=email, password=hashed_password, proyectos='')

        # Guardar el nuevo proyecto en la base de datos
        db.session.add(u)
        db.session.commit()
        flash(f"Usuario <strong>{nombre}</strong> añadido con éxito.", "success")
        return redirect(url_for("perfil"))
    else:
        return render_template("usuario_nuevo.html")
    
# Ruta para la página de editar usuario
@app.route("/perfil/usuario_editar/<string:id>", methods=["GET", "POST"])
@login_required
def usuario_editar(id=None):
    u = db.one_or_404(db.select(Usuario).where(Usuario.id == id))
    if request.method == "POST":
        u.nombre = request.form['nombre']
        u.apellidos = request.form['apellidos']
        u.email = request.form['email']

        password = request.form['password']
        # Obtener la contraseña y encriptarla
        password = request.form['password']
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
        
        u.password = hashed_password

        db.session.commit()
        flash(f"Usuario <strong>{u.nombre}</strong> modificado con éxito.", "success")
        return redirect(url_for("perfil"))
    else:
        return render_template("usuario_editar.html", usuario=u)

# Ruta para eliminar un usuario
@app.route("/usuario_eliminar/<string:id>")
@login_required
def usuario_eliminar(id=None):
    u = db.one_or_404(db.select(Usuario).where(Usuario.id == id))
    db.session.delete(u)
    db.session.commit()
    flash(f"Proyecto <strong>{u.nombre}</strong> eliminado con éxito.", "success")
    return redirect(url_for("perfil"))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)