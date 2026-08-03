import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { Category, ProductFilter, ProductListResponseData } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api';

    getProducts(filter: ProductFilter): Observable<ApiResponse<ProductListResponseData>> {
        let params = new HttpParams()
            .set('sortBy', filter.sortBy)
            .set('sortDirection', filter.sortDirection)
            .set('pageNumber', filter.pageNumber)
            .set('pageSize', filter.pageSize);

        const search = filter.search?.trim();
        const brand = filter.brand?.trim();
        if (search) params = params.set('search', search);
        if (brand) params = params.set('brand', brand);
        if (filter.categoryId !== null && filter.categoryId !== undefined) params = params.set('categoryId', filter.categoryId);
        if (filter.minPrice !== null && filter.minPrice !== undefined) params = params.set('minPrice', filter.minPrice);
        if (filter.maxPrice !== null && filter.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice);
        if (filter.inStock !== null && filter.inStock !== undefined) params = params.set('inStock', filter.inStock);

        return this.http.get<ApiResponse<ProductListResponseData>>(`${this.apiUrl}/products`, { params });
    }

    getCategories(): Observable<ApiResponse<Category[]>> {
        return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/categories`);
    }
}
