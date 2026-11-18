/** Minúsculas, sin acentos y espacios colapsados (para comparar y buscar). */
export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Clave única de un artículo de despensa: nombre + marca. */
export function itemKey(name: string, brand: string) {
  return `${normalize(name)}|${normalize(brand)}`;
}

export function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const words = normalize(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = normalize(fields.filter(Boolean).join(" "));
  return words.every((w) => haystack.includes(w));
}
