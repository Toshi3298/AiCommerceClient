import { Product } from './product.models';

export interface BiaChatRequest {
    message: string;
    conversationId: string | null;
}

export interface BiaChatResponseData {
    conversationId: string;
    action: string;
    message: string;
    products: Product[];
    product: Product | null;
    requiresAuthentication: boolean;
    requiresConfirmation: boolean;
    cartItemId: number | null;
    cartQuantity: number | null;
}
