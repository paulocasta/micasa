export const PAYMENT_METHODS = [
  "Efectivo",
  "Débito",
  "Crédito",
  "Transferencia",
  "Mercado Pago",
  "Débito automático",
  "Modo"
] as const;

export const AUTO_DEBIT_METHOD = "Débito automático";

export const UNITS = ["unidad", "paquete", "kg", "g", "litro", "botella", "lata", "caja", "bolsa", "docena"];

export const EXPENSE_CATEGORIES = ["Farmacia", "Limpieza", "Ferretería", "Hogar", "Super", "Mercado Libre", "Servicios", "Otros"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
