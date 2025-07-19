export interface Order {
  id: number;
  status: string;
  userId: number;
  adminId?: number;
  discountId?: number;
  createdAt: string;
}

export interface CreateOrderDto {
  status: string;
  userId: number;
  adminId?: number;
  discountId?: number;
}

export interface UpdateOrderDto {
  status?: string;
  adminId?: number;
  discountId?: number;
}
