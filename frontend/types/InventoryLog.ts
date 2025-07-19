export interface InventoryLog {
  id: number;
  productId: number;
  change: number;
  reason: string;
  adminId: number;
  createdAt: string;
}
