#!/bin/sh
set -eu

mkdir -p /app/data
chown -R nextjs:nodejs /app/data

exec gosu nextjs sh -c "node node_modules/prisma/build/index.js migrate deploy && node server.js"
