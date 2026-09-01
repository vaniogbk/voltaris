# Image de production pour l'API Stihl Market.
# Railway détecte ce Dockerfile automatiquement s'il est présent ; sinon
# Nixpacks utilise les scripts build/start du package.json, ce qui fonctionne
# tout aussi bien.

FROM node:20-alpine AS deps
WORKDIR /app
# OpenSSL est requis par les moteurs Prisma sur Alpine.
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

# Un utilisateur non privilégié limite l'impact d'une compromission du process.
USER node
EXPOSE 4000

# Les migrations sont appliquées au démarrage : un déploiement Railway met la
# base à niveau avant d'accepter du trafic.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
