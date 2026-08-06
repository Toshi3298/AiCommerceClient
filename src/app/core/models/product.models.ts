export interface Product {
    id: number;
    name: string;
    description: string;
    brand: string;
    price: number;
    stock: number;
    isActive: boolean;
    createdAt: string;
    categoryId: number;
    categoryName: string;
    imageUrl: string | null;
}

export interface ProductListResponseData {
    items: Product[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface ProductFilter {
    search?: string;
    brand?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy: 'name' | 'price' | 'stock' | 'createdat' | 'createdAt';
    sortDirection: 'asc' | 'desc';
    pageNumber: number;
    pageSize: number;
}

export interface Category {
    id: number;
    name: string;
    description: string;
}
