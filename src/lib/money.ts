// Montos en centavos (Int) en la base; se muestran en pesos argentinos.

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "—";
  return formatter.format(cents / 100);
}

/**
 * Convierte texto ingresado por el usuario a centavos.
 * Acepta "150000", "150.000", "150.000,50", "1500.5".
 * Devuelve null si está vacío o no es válido.
 */
export function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

/** Centavos -> texto editable ("150000,5") */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

export function formatQuantity(q: number) {
  return Number.isInteger(q) ? String(q) : q.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}
