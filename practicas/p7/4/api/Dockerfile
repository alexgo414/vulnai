FROM python:3.12-slim
RUN apt-get update && apt-get install -y gcc libffi-dev libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
ENV PYTHONUNBUFFERED=1
CMD ["flask", "run", "--host=0.0.0.0"]