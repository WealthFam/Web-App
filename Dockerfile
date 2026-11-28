# Stage 1: Build
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_DISABLE_TELEMETRY=false
ARG VITE_TELEMETRY_URL=/telemetry
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DISABLE_TELEMETRY=$VITE_DISABLE_TELEMETRY
ENV VITE_TELEMETRY_URL=$VITE_TELEMETRY_URL
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine

LABEL org.opencontainers.image.title="WealthFam Web-App" \
      org.opencontainers.image.description="WealthFam Vue 3 consumer wealth management dashboard and Nginx ingress." \
      org.opencontainers.image.source="https://github.com/WealthFam/Web-App" \
      org.opencontainers.image.vendor="WGLabz"

COPY --from=build-stage /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing, API proxying, and unprivileged execution
RUN printf "pid /tmp/nginx.pid;\n\
events { worker_connections 1024; }\n\
http {\n\
    include /etc/nginx/mime.types;\n\
    default_type application/octet-stream;\n\
    client_body_temp_path /tmp/client_temp;\n\
    proxy_temp_path /tmp/proxy_temp;\n\
    fastcgi_temp_path /tmp/fastcgi_temp;\n\
    uwsgi_temp_path /tmp/uwsgi_temp;\n\
    scgi_temp_path /tmp/scgi_temp;\n\
    server {\n\
        listen 8080;\n\
        client_max_body_size 50M;\n\
        resolver 127.0.0.11 valid=30s ipv6=off;\n\
        location / {\n\
            root /usr/share/nginx/html;\n\
            index index.html;\n\
            try_files \$uri \$uri/ /index.html;\n\
        }\n\
        location = /health {\n\
            set \$backend_upstream http://backend:8000;\n\
            proxy_pass \$backend_upstream/health;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Host \$host;\n\
        }\n\
        location /ws/ {\n\
            set \$backend_upstream http://backend:8000;\n\
            proxy_pass \$backend_upstream;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Upgrade \$http_upgrade;\n\
            proxy_set_header Connection \"upgrade\";\n\
            proxy_set_header Host \$host;\n\
        }\n\
        location /api/v1/backup/ {\n\
            client_max_body_size 512M;\n\
            set \$backend_upstream http://backend:8000;\n\
            proxy_pass \$backend_upstream;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Host \$host;\n\
            proxy_request_buffering off;\n\
            proxy_read_timeout 300s;\n\
            proxy_send_timeout 300s;\n\
        }\n\
        location /api {\n\
            set \$backend_upstream http://backend:8000;\n\
            proxy_pass \$backend_upstream;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Host \$host;\n\
        }\n\
        location /telemetry/ {\n\
            set \$admin_upstream http://admin-backend:8002;\n\
            rewrite ^/telemetry/(.*)\$ /v1/telemetry/\$1 break;\n\
            proxy_pass \$admin_upstream;\n\
            proxy_http_version 1.1;\n\
            proxy_set_header Host \$host;\n\
        }\n\
    }\n\
}\n" > /etc/nginx/nginx.conf && \
    mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx /tmp/*_temp

USER nginx

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q --spider -T 3 http://127.0.0.1:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
