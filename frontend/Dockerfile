FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Genera certificado autofirmado para HTTPS (RNF-01)
RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/ssl \
 && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/clinica.key \
      -out    /etc/nginx/ssl/clinica.crt \
      -subj   "/C=CO/ST=Bogota/O=ClinicaOS/CN=localhost"
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
