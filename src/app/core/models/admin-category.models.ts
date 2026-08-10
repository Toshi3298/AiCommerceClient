export interface AdminCategory {
    id: number;
    name: string;
    description: string | null;
}

export interface CreateCategoryRequest {
    name: string;
    description: string | null;
}

export interface CreateCategoryResponseData {
    categoryId: number;
}

export interface UpdateCategoryRequest {
    name: string;
    description: string | null;
}
