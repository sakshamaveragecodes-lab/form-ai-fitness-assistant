FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4173 FORM_BIND_ADDRESS=0.0.0.0
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/.wrangler /app/.sites-runtime && chown -R node:node /app
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --start-period=40s CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-local.mjs"]
