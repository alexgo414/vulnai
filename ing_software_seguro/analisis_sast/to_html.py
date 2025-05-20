import subprocess
import json

# Ejecutar pylint y capturar la salida en formato JSON
resultado = subprocess.run(
    [
        r"C:\Users\juanj\AppData\Local\Programs\Python\Python312\Scripts\pylint.exe",
        "insecure_code.py",
        "--output-format=json"
    ],
    capture_output=True,
    text=True
)

# Verificar que haya salida
if resultado.stdout.strip():
    with open("reporte.json", "w", encoding="utf-8") as f:
        json.dump(json.loads(resultado.stdout), f, indent=4)
    print("✅ Archivo reporte.json generado correctamente.")
else:
    print("⚠ No se generó salida válida.")