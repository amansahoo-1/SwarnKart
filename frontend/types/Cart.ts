export interface Cart {
  id: number;
  userId: number;
  updatedAt: string;
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
}
