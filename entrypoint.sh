#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

echo "Applying database migrations (prisma migrate deploy)..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting server..."
exec node server.js
