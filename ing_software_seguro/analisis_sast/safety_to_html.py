import json
import pandas as pd
from jinja2 import Template

# Leer el reporte JSON de Safety
with open("safety_report.json", "r") as f:
    data = json.load(f)

# Convertir a DataFrame de pandas
df = pd.DataFrame(data["vulnerabilities"])

# Plantilla HTML básica
html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>Safety Vulnerability Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #d9534f; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .critical { background-color: #ffcccc; }
        .high { background-color: #ffe6cc; }
    </style>
</head>
<body>
    <h1>Safety Vulnerability Report</h1>
    <p><strong>Scanned on:</strong> {{ timestamp }}</p>
    <table>
        <tr>
            <th>Paquete</th>
            <th>Versión</th>
            <th>CVE</th>
            <th>Severidad</th>
            <th>Descripción</th>
        </tr>
        {% for _, row in df.iterrows() %}
        <tr class="{{ row.severity.lower() }}">
            <td>{{ row.package_name }}</td>
            <td>{{ row.analyzed_version }}</td>
            <td><a href="{{ row.advisory }}" target="_blank">{{ row.vulnerability_id }}</a></td>
            <td>{{ row.severity }}</td>
            <td>{{ row.description }}</td>
        </tr>
        {% endfor %}
    </table>
</body>
</html>
"""

# Renderizar HTML
template = Template(html_template)
html_output = template.render(df=df, timestamp=pd.Timestamp.now())

# Guardar el informe HTML
with open("safety_report.html", "w") as f:
    f.write(html_output)

print("Informe HTML generado: safety_report.html")
