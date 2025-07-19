export interface Wishlist {
  id: number;
  userId: number;
}

export interface WishlistItem {
  id: number;
  wishlistId: number;
  productId: number;
  addedAt: string;
}
