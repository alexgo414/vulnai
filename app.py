import toml
from flask import Flask, render_template, request, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, func

app = Flask(__name__)
app.config.from_file("config.toml", load=toml.load)
app.secret_key = app.config['SECRET_KEY']

db = SQLAlchemy()
db.init_app(app)

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
    return render_template('perfil.html')

# Ruta para la página de login
@app.route('/login')
def login():
    return render_template('login.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)