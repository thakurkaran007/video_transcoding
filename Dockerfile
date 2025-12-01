# install deps
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json turbo.json ./

COPY /apps ./apps
COPY /packages ./packages

RUN npm install


# build
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app .

WORKDIR /app/packages/db
RUN npx prisma generate

WORKDIR /app
RUN npm run build --filter=web


FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/user-app/.next ./.next
COPY --from=builder /app/apps/user-app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/user-app/package.json ./
COPY --from=builder /app/apps/user-app/next.config.ts ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]