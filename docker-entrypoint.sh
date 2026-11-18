#!/bin/sh
set -e
echo "Aplicando migraciones..."
(cd /app/migrator && node node_modules/prisma/build/index.js migrate deploy)
exec node server.js
