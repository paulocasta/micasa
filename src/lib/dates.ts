// Fechas en horario de Argentina (UTC-3, sin horario de verano).
export const TIME_ZONE = "America/Argentina/Buenos_Aires";
const OFFSET = "-03:00";

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Año, mes (1-12) y día de una fecha en horario argentino. */
export function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "YYYY-MM" */
export function toPeriod(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

export function periodOf(date: Date) {
  const { year, month } = localParts(date);
  return toPeriod(year, month);
}

export function parsePeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { year: y, month: m };
}

export function nextPeriod(period: string) {
  const { year, month } = parsePeriod(period);
  return month === 12 ? toPeriod(year + 1, 1) : toPeriod(year, month + 1);
}

/** Períodos desde `from` hasta `to` inclusive. */
export function periodsBetween(from: string, to: string) {
  const out: string[] = [];
  for (let p = from; p <= to; p = nextPeriod(p)) out.push(p);
  return out;
}

export function periodLabel(period: string) {
  const { year, month } = parsePeriod(period);
  return `${MONTHS[month - 1]} ${year}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Fecha local (mediodía, para evitar saltos de día) a partir de año/mes/día. */
export function localDate(year: number, month: number, day: number) {
  const d = Math.min(day, daysInMonth(year, month));
  return new Date(`${year}-${pad(month)}-${pad(d)}T12:00:00${OFFSET}`);
}

/** "YYYY-MM-DD" (valor de <input type="date">) -> Date */
export function parseDateInput(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return localDate(y, m, d);
}

/** Date -> "YYYY-MM-DD" */
export function toDateInput(date: Date) {
  const { year, month, day } = localParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayInput() {
  return toDateInput(new Date());
}

export function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Rango [start, end) de un mes en horario argentino. */
export function monthRange(year: number, month: number) {
  const start = new Date(`${year}-${pad(month)}-01T00:00:00${OFFSET}`);
  const end =
    month === 12
      ? new Date(`${year + 1}-01-01T00:00:00${OFFSET}`)
      : new Date(`${year}-${pad(month + 1)}-01T00:00:00${OFFSET}`);
  return { start, end };
}

/** Rango [start, end) de un año en horario argentino. */
export function yearRange(year: number) {
  return {
    start: new Date(`${year}-01-01T00:00:00${OFFSET}`),
    end: new Date(`${year + 1}-01-01T00:00:00${OFFSET}`),
  };
}

/** Fechas de `count` cuotas mensuales desde `firstPeriod` ("YYYY-MM"), el mismo día (recortado a fin de mes). */
export function installmentDates(firstPeriod: string, day: number, count: number) {
  const out: Date[] = [];
  let p = firstPeriod;
  for (let i = 0; i < count; i++, p = nextPeriod(p)) {
    const { year, month } = parsePeriod(p);
    out.push(localDate(year, month, day));
  }
  return out;
}
