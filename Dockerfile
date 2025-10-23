# 1. Usar una imagen oficial de Node.js (versión 18 o la que uses)
FROM node:18-alpine AS builder

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de definición de dependencias
COPY package.json package-lock.json ./

# 4. Instalar las dependencias de producción
RUN npm ci --only=production

# 5. Copiar TODO el resto del código de tu proyecto
COPY . .

# 6. Exponer el puerto que tu app usa internamente (aunque Render lo mapea)
EXPOSE 3000

# 7. El comando para arrancar tu aplicación
CMD ["node", "CONTROLADOR/server.js"]
