export interface CreateOrderRequest { shippingAddress: string; }
export interface CreateOrderResponseData { orderId: number; totalPrice: number; }
export interface OrderSummary { orderId: number; createdAt: string; status: string; totalPrice: number; shippingAddress: string; totalQuantity: number; }
export interface OrderItem { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number; imageUrl: string | null; }
export interface OrderDetail { orderId: number; createdAt: string; status: string; shippingAddress: string; totalPrice: number; items: OrderItem[]; }
