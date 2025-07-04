from flask import Flask, render_template

app = Flask(__name__)

# Ruta para la página inicial
@app.route('/')
def index():
    return render_template('index.html')

# Ruta para la página de chat
@app.route('/chat')
def chat():
    return render_template('chat.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)