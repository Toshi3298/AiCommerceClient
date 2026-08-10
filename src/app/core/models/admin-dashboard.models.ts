export interface AdminRecentOrder {
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

export interface AdminDashboardData {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    totalCategories: number;
    totalCustomers: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    recentOrders: AdminRecentOrder[];
}
