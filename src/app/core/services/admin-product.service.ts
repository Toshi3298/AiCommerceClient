import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProductFilter, CreateProductRequest, CreateProductResponseData, UpdateProductRequest } from '../models/admin-product.models';
import { ApiResponse } from '../models/api-response';
import { Category, Product, ProductListResponseData } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class AdminProductService {
    private readonly http = inject(HttpClient);
    private readonly adminProductsUrl = 'http://localhost:5041/api/admin/products';
    private readonly productsUrl = 'http://localhost:5041/api/products';
    private readonly categoriesUrl = 'http://localhost:5041/api/categories';

    getProducts(filter: AdminProductFilter): Observable<ApiResponse<ProductListResponseData>> {
        let params = new HttpParams().set('sortBy', filter.sortBy).set('sortDirection', filter.sortDirection).set('pageNumber', filter.pageNumber).set('pageSize', filter.pageSize);

        if (filter.search) params = params.set('search', filter.search);
        if (filter.brand) params = params.set('brand', filter.brand);
        if (filter.categoryId !== undefined) params = params.set('categoryId', filter.categoryId);
        if (filter.minPrice !== undefined) params = params.set('minPrice', filter.minPrice);
        if (filter.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice);
        if (filter.inStock !== undefined) params = params.set('inStock', filter.inStock);
        if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive);

        return this.http.get<ApiResponse<ProductListResponseData>>(this.adminProductsUrl, { params });
    }

    getProductById(id: number): Observable<ApiResponse<Product>> {
        return this.http.get<ApiResponse<Product>>(`${this.adminProductsUrl}/${id}`);
    }

    createProduct(request: CreateProductRequest): Observable<ApiResponse<CreateProductResponseData>> {
        return this.http.post<ApiResponse<CreateProductResponseData>>(this.productsUrl, request);
    }

    updateProduct(id: number, request: UpdateProductRequest): Observable<ApiResponse<unknown>> {
        return this.http.put<ApiResponse<unknown>>(`${this.productsUrl}/${id}`, request);
    }

    deactivateProduct(id: number): Observable<ApiResponse<unknown>> {
        return this.http.delete<ApiResponse<unknown>>(`${this.productsUrl}/${id}`);
    }

    getCategories(): Observable<ApiResponse<Category[]>> {
        return this.http.get<ApiResponse<Category[]>>(this.categoriesUrl);
    }
}
