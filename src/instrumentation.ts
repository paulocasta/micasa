export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ default: cron }, { db }, { ensureRecurringEntries }, { seedCategories }] = await Promise.all([
    import("node-cron"),
    import("@/lib/db"),
    import("@/server/recurring"),
    import("@/lib/seed-data"),
  ]);

  if (await seedCategories(db).catch(() => false)) console.log("[seed] categorías iniciales creadas");

  const run = async (reason: string) => {
    try {
      const created = await ensureRecurringEntries(db);
      if (created) console.log(`[recurrentes] ${reason}: ${created} entradas creadas`);
    } catch (err) {
      console.error("[recurrentes] error", err);
    }
  };

  // Al arrancar: recupera meses perdidos si el contenedor estuvo apagado.
  await run("inicio");
  // Todos los días a las 00:05 hora argentina.
  cron.schedule("5 0 * * *", () => run("cron"), { timezone: "America/Argentina/Buenos_Aires" });
}
