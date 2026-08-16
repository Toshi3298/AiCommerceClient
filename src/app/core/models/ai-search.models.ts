import { Product } from './product.models';

export interface AiSearchRequest {
    prompt: string;
}

export interface AiSearchResponseData {
    prompt: string;
    generatedSql: string;
    products: Product[];
}

export interface AiProductSearchFilter {
    search: string | null;
    brand: string | null;
    categoryName: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    inStock: boolean | null;
    sortBy: string;
    sortDirection: string;
    limit: number;
}

export interface AiFilterSearchResponseData {
    prompt: string;
    filter: AiProductSearchFilter;
    products: Product[];
}
