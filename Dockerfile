# ===============================
# ETAPA 1 — BUILD
# ===============================
FROM node:18-alpine AS build

WORKDIR /app

# Recebe as variáveis NO BUILD
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Exporta para o Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Dependências
COPY package*.json ./
RUN npm install

# Código
COPY . .

# Build
RUN npm run build


# ===============================
# ETAPA 2 — NGINX
# ===============================
FROM nginx:alpine

# Remove config default
RUN rm /etc/nginx/conf.d/default.conf

# Copia nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build do Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
