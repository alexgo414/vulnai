from flask import Flask, render_template

app = Flask(__name__)

@app.route('/suma/<int:a>/<int:b>')
def suma(a, b):
    resultado = a + b
    return render_template('resultado.html', resultado=resultado)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)