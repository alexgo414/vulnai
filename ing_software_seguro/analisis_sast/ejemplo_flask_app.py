from flask import Flask, request, Response

app = Flask(__name__)

@app.route("/search")
def search():
    # Obtener parámetro 'q' de la URL
    query = request.args.get("q", "")

    # ¡Vulnerabilidad XSS!
    return f"<h1>Resultados para: {query}</h1>"

if __name__ == "__main__":
    app.run(debug=True)
