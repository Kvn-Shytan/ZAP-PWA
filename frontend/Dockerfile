# ---- Etapa 1: Builder ----
# Construcción de la aplicación estática PWA
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copiar configuración de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción (genera la carpeta /dist)
RUN npm run build

# ---- Etapa 2: Runner (Servidor Nginx) ----
# Imagen ultra-ligera y segura para servir estáticos
FROM nginx:alpine AS runner

# Remover la configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar nuestra configuración personalizada para la SPA y caché
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de la etapa builder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Exponer el puerto 80 (Cloud Run mapea dinámicamente este puerto)
EXPOSE 80

# Nginx se ejecuta por defecto, no necesitamos un CMD específico
