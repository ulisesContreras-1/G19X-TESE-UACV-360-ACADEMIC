# Dockerfile para Backend FastAPI + WeasyPrint + LangChain
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema operativo requeridas por WeasyPrint (renderizado PDF) y PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar manifiesto de dependencias e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente del backend
COPY . .

# Exponer puerto FastAPI
EXPOSE 8000

# Ejecutar servidor de desarrollo con recarga en caliente
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
