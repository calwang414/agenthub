export interface MockProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  status: "active" | "draft" | "archived";
}

export const mockProducts: MockProduct[] = [
  { id: "1", name: "产品 A", price: 99.00, category: "电子产品", status: "active" },
  { id: "2", name: "产品 B", price: 199.00, category: "服装", status: "active" },
  { id: "3", name: "产品 C", price: 299.00, category: "家居", status: "draft" },
  { id: "4", name: "产品 D", price: 399.00, category: "电子产品", status: "archived" },
];

export async function fetchMockProducts(): Promise<MockProduct[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockProducts), 300);
  });
}
