# Etapa 1 - Build com Node
FROM node:18-alpine AS build

WORKDIR /app

# Copia somente os manifests primeiro (melhora cache)
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Corrige permissão do bin do vite (evita sh: vite: Permission denied)
RUN chmod +x node_modules/.bin/vite

# Compila o projeto
RUN npm run build

# Etapa 2 - Servidor web com Nginx
FROM nginx:alpine

# Remove o config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nosso config customizado
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos buildados para o servidor
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
