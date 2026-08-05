import { Product } from './product.models';

export interface AiSearchRequest {
    prompt: string;
}

export interface AiSearchResponseData {
    prompt: string;
    generatedSql: string;
    products: Product[];
}
