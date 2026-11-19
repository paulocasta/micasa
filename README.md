# Mi Casa

App web para registrar los gastos de la casa: **Despensa**, **Impuestos**, **Reparaciones** y **Gastos varios**, con un **Inicio** que resume el gasto por mes o año.

Stack: Next.js 16 (App Router, Server Actions) · Prisma 7 + SQLite · Tailwind 4 + shadcn/ui · Recharts.

## Secciones

- **Inicio**: gasto por sección y total del período (filtro mes/año), comparación con el período anterior, gráfico mensual del año (con vista de tabla), artículos con stock bajo, próximos impuestos, últimos pagados y últimas reparaciones.
- **Despensa**: artículos por categoría/subcategoría, buscador, botones +/−. "Registrar compra" suma al stock si el artículo (nombre + marca) ya existe — ej. 1 Yerba Playadito + 4 = 5. El costo de la compra cuenta como gasto del mes. Cada artículo tiene stock mínimo y un historial de movimientos.
- **Impuestos**: pendientes / vencidos / pagados con fecha, medio y monto. **Recurrentes**:
  - *Pago manual* (ej. Luz EPE): genera las entradas pendientes hasta diciembre; el 1° de enero genera el año nuevo.
  - *Débito automático* (ej. Internet): cada mes se crea la entrada como pagada con el monto configurado.
  - Un job diario (00:05, hora Argentina) y el arranque del servidor generan lo que falte. Si borrás una entrada generada, no se vuelve a crear.
- **Reparaciones**: por hacer (costo estimado) o hechas (fecha y costo real). Solo las hechas suman al gasto.
- **Gastos varios**: compras y pagos sueltos que no son stock de despensa — remedios, baldes, escobas, el jardinero. Cada gasto lleva categoría (Farmacia, Limpieza, Ferretería, Hogar, Super, Mercado Libre, Servicios, Otros), fecha y monto; medio de pago, comercio y notas son opcionales. Filtro por categoría y año. Las categorías se editan en `EXPENSE_CATEGORIES` (`src/lib/constants.ts`).

Reglas de gasto: Despensa = compras con costo por fecha de compra; Impuestos = pagados por fecha de pago; Reparaciones = hechas por fecha; Gastos varios = todos, por fecha.

## Desarrollo

```bash
npm install
cp .env.example .env          # DATABASE_URL, APP_PASSWORD, SESSION_SECRET
npx prisma migrate deploy
npm run db:seed               # categorías iniciales
npm run dev                   # http://localhost:3000
npm test                      # Vitest (unitarios + integración con SQLite temporal)
```

Con `APP_PASSWORD` vacío no se pide login (útil en red local). Tras cambiar `prisma/schema.prisma`: `npx prisma migrate dev --name <cambio>` y `npx prisma generate`.

## Docker

```bash
cp .env.docker.example .env.docker   # completar APP_PASSWORD y SESSION_SECRET
docker compose up -d --build
```

- La base SQLite queda en `./data/micasa.db` (volumen). Para backup alcanza con copiar ese archivo.
- Al arrancar el contenedor aplica migraciones, crea categorías si la base está vacía y genera impuestos recurrentes pendientes.

### Pasar a una VPS

Mismo `docker compose` detrás de un proxy inverso con HTTPS, por ejemplo Caddy:

```
micasa.tudominio.com {
    reverse_proxy localhost:3000
}
```

En `.env.docker` poné `COOKIE_SECURE=true`, una `APP_PASSWORD` fuerte y un `SESSION_SECRET` aleatorio (`openssl rand -hex 32`). Conviene publicar el puerto solo en localhost (`"127.0.0.1:3000:3000"`).
