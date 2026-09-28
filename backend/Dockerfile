# Image de production pour l'API Voltaris.
#
# Railway détecte ce Dockerfile et l'utilise, ce qui rend inopérants le
# `builder` et le `startCommand` de railway.json : c'est le CMD ci-dessous qui
# fait foi. Toute étape de démarrage doit donc être ajoutée ici, pas là-bas.

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
#
# `--if-empty` n'amorce le catalogue que si la base ne contient aucune
# catégorie. Une base fraîchement provisionnée se remplit donc seule, et une
# boutique en activité n'est jamais réécrite par un redéploiement.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed/seed.js --if-empty && node dist/server.js"]
