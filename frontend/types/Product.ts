export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  createdById: number;
  createdAt: string;
}

export interface CreateProductDto {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  createdById: number;
}

export interface UpdateProductDto {
  name?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
}
