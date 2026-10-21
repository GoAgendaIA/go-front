FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# production (por defecto) o pruebas: elige el environment que se compila (URL de la API y claves de Supabase).
ARG ANGULAR_CONFIGURATION=production
RUN npx ng build --configuration "$ANGULAR_CONFIGURATION"

FROM nginx:alpine
COPY --from=build /app/dist/go-agenda/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
