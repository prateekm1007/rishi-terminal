# Dockerfile — Hugging Face staging Space (E1, measurement only).
#
# Founder order (E1): multi-stage, Node 22, `npm ci`, `next build`, then
# `next start -p 7860 -H 0.0.0.0`. Nothing Vercel-specific is required:
# CI already runs `next start` outside Vercel on every PR (smoke +
# Lighthouse jobs), and this image runs the same server in Docker.
# HF runs the container with user ID 1000 (Docker Spaces docs,
# Permissions) — the node:22-slim built-in `node` user is exactly uid
# 1000, so the runtime stage drops privileges to it.
#
# Secrets: nothing secret is copied or baked. The only build-args are the
# three build-time-inlined NEXT_PUBLIC_* values (public by design — the
# Supabase anon key is RLS-guarded and safe to publish; see .env.example),
# and their defaults are the SAME placeholders CI builds with, so the
# image builds identically in CI, locally, and on HF without any
# configuration. No production secret (service-role key, CRON_SECRET,
# chat keys, ANON_ID_PEPPER) is present at build or run time — per the
# founder's staging rule the Space serves the public, seed-backed pages
# only. .dockerignore keeps .env* out of the build context entirely.
#
# Healthcheck: /api/health is the public liveness/freshness endpoint.
# On a seed-only Space (no DB environment, by the founder's rule) the
# endpoint honestly reports its degraded verdict as HTTP 503 — that is
# C2 fail-closed behavior, not a dead server. The HEALTHCHECK therefore
# probes /api/health and treats ANY well-formed HTTP response as alive
# (transport failure or hang = unhealthy); the degraded/healthy verdict
# itself stays in the endpoint's status code and body, never rewritten.
# If a staging database is provisioned later (founder decision), the
# same probe returns 200 with no change to this file.

# --- deps stage: full dependency tree for the build -------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder stage: compile the production bundle ---------------------------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time-inlined public values (identical to the CI build env; the
# Space can override them with public Space VARIABLES, never secrets).
ARG NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="ci-placeholder-anon-key"
ARG NEXT_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime stage: production server ---------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    HOSTNAME=0.0.0.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# ISR revalidates in place: next writes .next/cache at runtime as the
# uid-1000 `node` user, so the copied build output must be owned by node
# — root-owned files would make every ISR cache write fail silently and
# freeze the pages stale.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
USER root
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:7860/api/health').then(()=>process.exit(0)).catch(()=>process.exit(1))"
CMD ["npx", "next", "start", "-p", "7860", "-H", "0.0.0.0"]
