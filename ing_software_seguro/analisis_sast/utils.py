import yaml
import hashlib

# Vulnerabilidad 5: Uso de YAML inseguro
def load_config(config_path):
    with open(config_path) as f:
        # ❌ yaml.load() permite ejecución de código
        return yaml.load(f)

# Vulnerabilidad 6: Hash inseguro
def hash_password(password):
    # ❌ MD5 es criptográficamente débil
    x = hashlib.md5(password.encode()).hexdigest()
    # ❌ SHA1 es criptográficamente débil
    return hashlib.sha1(x.encode()).hexdigest()

# Vulnerabilidad 7: Logging sensible
def log_action(action):
    with open("actions.log", "a") as f:
        # ❌ No sanitiza input (log injection)
        f.write(f"Acción: {action}\n")

# Vulnerabilidad 8: Uso de contraseñas harcodeadas
password = "P455WD123"

def acceder_informacion_confidencial2(self, password):
    """
    Accede a información confidencial solo si el usuario está autenticado y es un admin.
    """
    if password != "<PASSWORD>":
        return False
    return f"Información confidencial 2 entregada a {self.usuario}"

# Vulnerabilidad 9: Algoritmos débiles
def hash_malo_e_inutil (self):
    usuario_cifrado = hashlib.md5("contraseña".encode()).hexdigest()  # ⚠️ Uso de MD5 inseguro
    return hashlib.sha1("contraseña".encode()).hexdigest()  # ⚠️ Uso de SHA1 inseguro
