# Debian-based Node image. Not Alpine: DuckDB's native addon needs glibc.
# Node 24 runs the TypeScript seed script directly.
FROM node:24-slim

WORKDIR /app

# Install dependencies first, so this layer is cached until package files change.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source code (files in .dockerignore are skipped).
COPY . .

# Create the company database and build the Next.js app.
RUN npm run seed
RUN npx next build

ENV NODE_ENV=production
EXPOSE 3000

# GROQ_API_KEY is passed in at runtime, never baked into the image.
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
