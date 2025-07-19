export interface Discount {
  id: number;
  code: string;
  percentage: number;
  validTill: string;
  createdAt: string;
}

export interface CreateDiscountDto {
  code: string;
  percentage: number;
  validTill: string;
}

export interface UpdateDiscountDto {
  code?: string;
  percentage?: number;
  validTill?: string;
}
