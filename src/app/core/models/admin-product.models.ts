export interface AdminProductFilter {
    search?: string;
    brand?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    isActive?: boolean;
    sortBy: 'name' | 'price' | 'stock' | 'createdat';
    sortDirection: 'asc' | 'desc';
    pageNumber: number;
    pageSize: number;
}

export interface CreateProductRequest {
    name: string;
    description: string;
    brand: string;
    price: number;
    stock: number;
    categoryId: number;
    imageUrl: string | null;
}

export interface CreateProductResponseData {
    productId: number;
}

export interface UpdateProductRequest extends CreateProductRequest {
    isActive: boolean;
}
