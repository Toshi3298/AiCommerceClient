export interface CartItem {
    cartItemId: number;
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    availableStock: number;
    isActive: boolean;
}

export interface CartResponseData {
    cartId: number;
    items: CartItem[];
    totalQuantity: number;
    totalPrice: number;
}

export interface AddCartItemRequest {
    productId: number;
    quantity: number;
}

export interface AddCartItemResponseData {
    cartItemId: number;
    quantity: number;
}

export interface UpdateCartItemRequest {
    quantity: number;
}

export interface UpdateCartItemResponseData {
    cartItemId: number;
    quantity: number;
    lineTotal: number;
}

export interface ClearCartResponseData {
    removedItemCount: number;
}
