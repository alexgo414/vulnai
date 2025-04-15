import toml
import uuid
from flask import Flask, render_template, request, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, func
from datetime import date

app = Flask(__name__)
app.config.from_file("config.toml", load=toml.load)
app.secret_key = app.config['SECRET_KEY']

db = SQLAlchemy()
db.init_app(app)

# Definición de modelos
class Proyecto(db.Model):
    __tablename__ = 'proyectos'
    id = db.Column(db.String(36), primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.Date, nullable=False)
    fecha_modificacion = db.Column(db.Date, nullable=False)

# Crear la tabla proyectos en la base de datos
with app.app_context():
    db.create_all()

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
def perfil():
    proyectos = db.session.execute(db.select(Proyecto)).scalars().all()
    return render_template('perfil.html', proyectos=proyectos)

# Ruta para la página de login
@app.route('/login')
def login():
    return render_template('login.html')

# Ruta para la página de crear proyecto
@app.route('/perfil/proyecto_nuevo', methods=['GET', 'POST'])
def proyecto_nuevo():
    if request.method == "POST":
        # Generar un ID único automáticamente
        id = str(uuid.uuid4())

        # Obtener los datos del formulario
        nombre = request.form['nombre']
        descripcion = request.form['descripcion']
        fecha_creacion = request.form['fecha_creacion']
        if fecha_creacion != date.today().strftime("%Y-%m-%d"):
            fecha_modificacion = date.today().strftime("%Y-%m-%d")
        else:
            fecha_modificacion = fecha_creacion

        p = Proyecto(id=id, nombre=nombre, descripcion=descripcion, fecha_creacion=fecha_creacion, fecha_modificacion=fecha_modificacion)
        
        # Guardar el nuevo proyecto en la base de datos
        db.session.add(p)
        db.session.commit()
        flash(f"Proyecto <em>{nombre}</em> añadido con éxito.", "exito")
        return redirect(url_for("perfil"))
    else:
        return render_template("proyecto_nuevo.html")

# Ruta para la página de editar proyecto  
@app.route("/perfil/proyecto_editar/<string:id>", methods=["GET", "POST"])
def proyecto_editar(id=None):
    p = db.one_or_404(db.select(Proyecto).where(Proyecto.id == id))
    if request.method == "POST":
        p.nombre = request.form['nombre']
        p.descripcion = request.form['descripcion']
        p.fecha_modificacion = date.today()
        db.session.commit()
        flash(f"Proyecto <em>{p.nombre}</em> modificado con éxito.", "exito")
        return redirect(url_for("perfil"))
    else:
        return render_template("proyecto_editar.html", proyecto=p)

@app.route("/proyecto_eliminar/<string:id>")
def proyecto_eliminar(id=None):
    p = db.one_or_404(db.select(Proyecto).where(Proyecto.id == id))
    db.session.delete(p)
    db.session.commit()
    flash(f"Proyecto <em>{p.nombre}</em> eliminado con éxito.", "exito")
    return redirect(url_for("perfil"))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)