# ---- Etapa 1: Builder ----
# Imagen base ligera para construir las dependencias
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiar archivos de definición de paquetes y Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (necesitamos las dev para prisma generate)
# Usar npm ci es mejor para CI/CD pero npm install está bien aquí.
RUN npm install

# Generar el cliente de Prisma (usando el esquema copiado)
RUN npx prisma generate

# Copiar el resto del código fuente del backend
COPY . .

# ---- Etapa 2: Runner (Producción) ----
# Imagen final minimalista para producción
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Variables de entorno por defecto
ENV NODE_ENV=production

# Copiar solo lo estrictamente necesario desde la etapa builder
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/generated ./generated
COPY --from=builder /usr/src/app/index.js ./index.js
COPY --from=builder /usr/src/app/routes ./routes
COPY --from=builder /usr/src/app/middleware ./middleware
COPY --from=builder /usr/src/app/utils ./utils
COPY --from=builder /usr/src/app/validators ./validators
COPY --from=builder /usr/src/app/authMiddleware.js ./authMiddleware.js

# Exponer el puerto del servidor
EXPOSE 3001

# Ejecutar el comando de inicio de producción
CMD ["npm", "start"]
