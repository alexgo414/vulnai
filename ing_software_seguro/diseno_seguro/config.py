REGISTRY_FILE = "registry.log"

# --- DATOS DE PRUEBA: USUARIOS Y ROLES ---
users = {
    "alice": {"rol": "admin"},
    "bob": {"rol": "normal_user"},
    "eve": {"rol": "admin"},
}

# --- REGLAS DE ACCESO POR FUNCIÓN ---
access_rules = {
    "accion_confidencial": {"rol": "admin"},
    "ver_reporte": {"rol": "normal_user"},
    "editar_usuario": {"rol": "admin"},
}

# --- JERARQUÍA DE ROLES ---
role_hierarchy = {
    "admin": {"implied_roles": {"normal_user"}},  # admin incluye normal_user
    "normal_user": {"implied_roles": set()},
}

# Lista de funciones soportadas (como nombres de funciones)
funciones_soportadas = ["ver_reporte", "editar_usuario", "accion_confidencial"]