import { describe, expect, it } from "vitest";
import { byMonth, sumTotals } from "@/lib/dashboard-calc";
import { localDate, monthRange, periodOf, periodsBetween } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { planRecurring, type RecurringInput } from "@/lib/recurring-plan";
import { itemKey, matchesQuery } from "@/lib/text";

const base: RecurringInput = {
  id: 1,
  name: "Luz EPE",
  mode: "MANUAL",
  defaultAmount: null,
  paymentMethod: null,
  dueDay: 10,
  startPeriod: "2026-10",
  generatedThrough: null,
  active: true,
};

describe("planRecurring", () => {
  const oct4 = localDate(2026, 10, 4);

  it("manual: genera pendientes desde el inicio hasta diciembre", () => {
    const { entries, generatedThrough } = planRecurring(base, oct4);
    expect(entries.map((e) => e.period)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(entries.every((e) => e.status === "PENDING" && e.paidAt === null)).toBe(true);
    expect(periodOf(entries[0].dueDate)).toBe("2026-10");
    expect(generatedThrough).toBe("2026-12");
  });

  it("no regenera lo ya generado", () => {
    const { entries } = planRecurring({ ...base, generatedThrough: "2026-12" }, oct4);
    expect(entries).toHaveLength(0);
  });

  it("al empezar el año genera los 12 meses", () => {
    const { entries } = planRecurring({ ...base, generatedThrough: "2026-12" }, localDate(2027, 1, 1));
    expect(entries).toHaveLength(12);
    expect(entries[0].period).toBe("2027-01");
    expect(entries[11].period).toBe("2027-12");
  });

  it("débito automático: solo hasta el mes actual, como pagado", () => {
    const rt = { ...base, mode: "AUTO_DEBIT" as const, defaultAmount: 2500000, dueDay: 31, startPeriod: "2026-09" };
    const { entries, generatedThrough } = planRecurring(rt, oct4);
    expect(entries.map((e) => e.period)).toEqual(["2026-09", "2026-10"]);
    expect(entries[0]).toMatchObject({ status: "PAID", amount: 2500000, paymentMethod: "Débito automático" });
    // día 31 en septiembre se ajusta al 30
    expect(entries[0].paidAt!.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(generatedThrough).toBe("2026-10");
  });

  it("inactivo no genera", () => {
    expect(planRecurring({ ...base, active: false }, oct4).entries).toHaveLength(0);
  });
});

describe("parseMoney", () => {
  it.each([
    ["150000", 15000000],
    ["150.000", 15000000],
    ["150.000,50", 15000050],
    ["1500.5", 150050],
    ["$ 1.234", 123400],
    ["", null],
    ["abc", null],
  ])("%s -> %s", (input, expected) => expect(parseMoney(input)).toBe(expected));
});

describe("fechas y texto", () => {
  it("rango del mes usa horario argentino", () => {
    const { start, end } = monthRange(2026, 10);
    expect(start.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(periodsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("itemKey ignora mayúsculas, acentos y espacios", () => {
    expect(itemKey(" Yerba  Mate ", "PLAYADITO")).toBe(itemKey("yerba mate", "Playadito"));
    expect(itemKey("Azúcar", "")).toBe(itemKey("azucar", ""));
    expect(matchesQuery("yerba play", "Yerba mate", "Playadito")).toBe(true);
  });

  it("agrupa gastos por mes local", () => {
    const expenses = [
      // 1 de noviembre 01:00 UTC = 31 de octubre en Argentina
      { section: "despensa" as const, date: new Date("2026-11-01T01:00:00Z"), amount: 100 },
      { section: "impuestos" as const, date: localDate(2026, 11, 5), amount: 50 },
    ];
    const months = byMonth(expenses, 2026);
    expect(months[9].despensa).toBe(100);
    expect(months[10].impuestos).toBe(50);
    expect(sumTotals(expenses).total).toBe(150);
  });
});
