export type AdminOrderStatus = 'Pending' | 'Preparing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface AdminOrderSummary {
    orderId: number;
    createdAt: string;
    status: string;
    totalPrice: number;
    shippingAddress: string;
    totalQuantity: number;
    userId: number;
    customerName: string;
    customerEmail: string;
}

export interface AdminOrderItem {
    productId: number;
    productName: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface AdminOrderDetail {
    orderId: number;
    createdAt: string;
    status: string;
    totalPrice: number;
    shippingAddress: string;
    userId: number;
    customerName: string;
    customerEmail: string;
    items: AdminOrderItem[];
}

export interface AdminOrdersFilter {
    search?: string;
    status?: AdminOrderStatus;
    pageNumber: number;
    pageSize: number;
}

export interface AdminOrdersPagedData {
    items: AdminOrderSummary[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export interface UpdateAdminOrderStatusRequest {
    status: AdminOrderStatus;
}

export interface UpdateAdminOrderStatusResponseData {
    orderId: number;
    status: string;
}
