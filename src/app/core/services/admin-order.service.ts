import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminOrderDetail, AdminOrdersFilter, AdminOrdersPagedData, UpdateAdminOrderStatusRequest, UpdateAdminOrderStatusResponseData } from '../models/admin-order.models';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/admin/orders';

    getOrders(filter: AdminOrdersFilter): Observable<ApiResponse<AdminOrdersPagedData>> {
        let params = new HttpParams().set('pageNumber', filter.pageNumber).set('pageSize', filter.pageSize);
        if (filter.search) params = params.set('search', filter.search);
        if (filter.status) params = params.set('status', filter.status);
        return this.http.get<ApiResponse<AdminOrdersPagedData>>(this.apiUrl, { params });
    }

    getOrderById(orderId: number): Observable<ApiResponse<AdminOrderDetail>> {
        return this.http.get<ApiResponse<AdminOrderDetail>>(`${this.apiUrl}/${orderId}`);
    }

    updateOrderStatus(orderId: number, request: UpdateAdminOrderStatusRequest): Observable<ApiResponse<UpdateAdminOrderStatusResponseData>> {
        return this.http.put<ApiResponse<UpdateAdminOrderStatusResponseData>>(`${this.apiUrl}/${orderId}/status`, request);
    }
}
