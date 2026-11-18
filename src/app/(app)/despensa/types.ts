export type CategoryOption = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string }[];
};

export type ItemOption = {
  id: number;
  name: string;
  brand: string;
  unit: string;
  quantity: number;
};
