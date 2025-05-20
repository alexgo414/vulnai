import subprocess
import pickle

def insecure_deserialization(data):
    return pickle.loads(data)  # Vulnerable a deserialización insegura

def command_injection(cmd):
    subprocess.call(cmd, shell=True)  # Vulnerable a inyección de comandos

password = "12345"  # Contraseña hardcodeada