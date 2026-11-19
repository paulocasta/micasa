import { str } from "./action-result";

export const MAX_INSTALLMENTS = 60;

export type InstallmentInput = { count: number; firstPeriod: string };

/** Lee los campos "en cuotas" del formulario. null = pago único. */
export function readInstallments(fd: FormData): InstallmentInput | null | { error: string } {
  if (str(fd, "installments") !== "on") return null;
  const count = Number(str(fd, "installmentCount"));
  const firstPeriod = str(fd, "firstInstallment");
  if (!Number.isInteger(count) || count < 2 || count > MAX_INSTALLMENTS) {
    return { error: `La cantidad de cuotas tiene que ser entre 2 y ${MAX_INSTALLMENTS}` };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(firstPeriod)) return { error: "Indicá el mes de la primera cuota" };
  return { count, firstPeriod };
}
