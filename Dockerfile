# Dockerfile para Frontend React + Vite
FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos de paquetes
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de desarrollo configurado en package.json (3000)
EXPOSE 3000

# Iniciar servidor de desarrollo Vite escuchando en todas las interfaces (0.0.0.0)
CMD ["npm", "run", "dev"]
