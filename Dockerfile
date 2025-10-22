# Usa la imagen oficial de Node.js como base. Esto incluye Node y npm.
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos package.json y package-lock.json al directorio de trabajo
# Esto permite que Docker use el caché para las dependencias, haciéndolo más rápido
COPY package*.json ./

# Instala todas las dependencias del proyecto
RUN npm install

# Copia todo el código fuente del proyecto al contenedor
COPY . .

# Expone el puerto que usará la aplicación.
# En tu caso, es el puerto 3000 (o el que uses en tu archivo server.js)
EXPOSE 3000

# El comando para iniciar la aplicación cuando se ejecute el contenedor
CMD [ "node", "backend/server.js" ]