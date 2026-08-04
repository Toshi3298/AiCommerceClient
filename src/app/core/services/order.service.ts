import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { CreateOrderRequest, CreateOrderResponseData, OrderDetail, OrderSummary } from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/orders';

    createOrder(request: CreateOrderRequest): Observable<ApiResponse<CreateOrderResponseData>> {
        return this.http.post<ApiResponse<CreateOrderResponseData>>(this.apiUrl, request);
    }

    getOrders(): Observable<ApiResponse<OrderSummary[]>> {
        return this.http.get<ApiResponse<OrderSummary[]>>(this.apiUrl);
    }

    getOrderById(orderId: number): Observable<ApiResponse<OrderDetail>> {
        return this.http.get<ApiResponse<OrderDetail>>(`${this.apiUrl}/${orderId}`);
    }
}
