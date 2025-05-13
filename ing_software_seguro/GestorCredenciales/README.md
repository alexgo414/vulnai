# Mi Proyecto

Este es un ejemplo moderno de estructura de proyecto Python usando `uv`, `pyproject.toml` y buenas prácticas.

## 🚀 Uso rápido

### 1. Crear entorno virtual
```bash
uv venv
```

### 2. Activar entorno
- Linux/macOS:
```bash
source .venv/bin/activate
```
- Windows:
```bash
.venv\Scripts\activate
```

### 3. Instalar el proyecto (modo editable)
```bash
uv pip install -e .
```

### 4. Instalar dependencias de desarrollo
```bash
uv pip install -r requirements-dev.txt
```

### 5. Ejecutar pruebas
```bash
pytest
```

### 6. Linting con Ruff
```bash
ruff check src tests
```