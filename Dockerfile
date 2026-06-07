FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates gosu && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["./docker-entrypoint.sh"]
