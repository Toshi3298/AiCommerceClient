import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminCategory, CreateCategoryRequest, CreateCategoryResponseData, UpdateCategoryRequest } from '../models/admin-category.models';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/categories';

    getCategories(): Observable<ApiResponse<AdminCategory[]>> {
        return this.http.get<ApiResponse<AdminCategory[]>>(this.apiUrl);
    }

    createCategory(request: CreateCategoryRequest): Observable<ApiResponse<CreateCategoryResponseData>> {
        return this.http.post<ApiResponse<CreateCategoryResponseData>>(this.apiUrl, request);
    }

    updateCategory(id: number, request: UpdateCategoryRequest): Observable<ApiResponse<null>> {
        return this.http.put<ApiResponse<null>>(`${this.apiUrl}/${id}`, request);
    }

    deleteCategory(id: number): Observable<ApiResponse<null>> {
        return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
    }
}
