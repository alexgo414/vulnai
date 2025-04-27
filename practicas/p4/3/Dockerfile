FROM python:3.12-slim

# Instalar dependencias necesarias para cryptography
RUN apt-get update && apt-get install -y gcc libffi-dev libssl-dev && rm -rf /var/lib/apt/lists/*

# Resto de tu configuración
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt

CMD ["flask", "run", "--host=0.0.0.0"]