from flask import Flask, render_template

app = Flask(__name__)

# Ruta para la página inicial
@app.route('/')
def index():
    return render_template('index.html', title="Bienvenido a SVAIA")

# Ruta para la página de chat
@app.route('/chat')
def chat():
    mensajes = ["Hola, ¿en qué puedo ayudarte?", "Escribe tu mensaje aquí."]
    return render_template('chat.html', title="Chat de SVAIA", mensajes=mensajes)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)