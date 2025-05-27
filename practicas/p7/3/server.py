from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class ListenerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Obtener la longitud del contenido
        content_length = int(self.headers['Content-Length'])
        # Leer los datos del cuerpo
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        # Intentar parsear como JSON, si no, tratar como texto plano
        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            data = post_data
        
        print(f"Datos recibidos en {self.path}:", data)
        
        # Enviar respuesta
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {'message': 'Recibido', 'data': data}
        self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_GET(self):
        # Responder a GET para verificar que el servidor está activo
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Servidor de escucha activo")

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ListenerHandler)
    print(f"Servidor escuchando en http://localhost:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
