import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import {
    AddCartItemRequest,
    AddCartItemResponseData,
    CartResponseData,
    ClearCartResponseData,
    UpdateCartItemRequest,
    UpdateCartItemResponseData
} from '../models/cart.models';

@Injectable({ providedIn: 'root' })
export class CartService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/cart';

    getCart(): Observable<ApiResponse<CartResponseData>> {
        return this.http.get<ApiResponse<CartResponseData>>(this.apiUrl);
    }

    addItem(request: AddCartItemRequest): Observable<ApiResponse<AddCartItemResponseData>> {
        return this.http.post<ApiResponse<AddCartItemResponseData>>(`${this.apiUrl}/items`, request);
    }

    updateItem(cartItemId: number, request: UpdateCartItemRequest): Observable<ApiResponse<UpdateCartItemResponseData>> {
        return this.http.put<ApiResponse<UpdateCartItemResponseData>>(`${this.apiUrl}/items/${cartItemId}`, request);
    }

    removeItem(cartItemId: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/items/${cartItemId}`);
    }

    clearCart(): Observable<ApiResponse<ClearCartResponseData>> {
        return this.http.delete<ApiResponse<ClearCartResponseData>>(this.apiUrl);
    }
}
