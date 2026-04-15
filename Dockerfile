# Stage 1: Build
FROM node:20 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_PARSER_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PARSER_API_URL=$VITE_PARSER_API_URL
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing and API proxying
RUN printf "server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
    location /api {\n\
        proxy_pass http://backend:8000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Host \$host;\n\
    }\n\
    location /parser/ {\n\
        proxy_pass http://parser:8001/v1/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Host \$host;\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
