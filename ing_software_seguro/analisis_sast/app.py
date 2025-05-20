from flask import Flask, request, render_template_string
from models import DB
from utils import log_action
import pickle
import subprocess

app = Flask(__name__)
db = DB()

# Vulnerabilidad 1: XSS Reflejado
@app.route("/search")
def search():
    query = request.args.get("q", "")
    return f"<h1>Resultados para: {query}</h1>"  # ❌ Sin sanitización

# Vulnerabilidad 2: SQL Injection
@app.route("/user")
def get_user():
    user_id = request.args.get("id")
    query = f"SELECT * FROM users WHERE id = {user_id}"  # ❌ Consulta concatenada
    return db.execute(query)

# Vulnerabilidad 3: Deserialización insegura
@app.route("/admin")
def admin():
    data = request.cookies.get("session_data")
    user = pickle.loads(data.encode())  # ❌ Deserialización peligrosa
    return f"Bienvenido, {user['name']}"

# Vulnerabilidad 4: Ejecución de comandos
@app.route("/ping")
def ping():
    host = request.args.get("host", "8.8.8.8")
    return subprocess.getoutput(f"ping -c 1 {host}")  # ❌ Shell injection

if __name__ == "__main__":
    app.run(debug=True)