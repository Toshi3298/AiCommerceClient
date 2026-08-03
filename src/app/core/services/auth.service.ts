import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { LoginRequest, LoginResponseData, RegisterRequest, RegisterResponseData } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/auth';

    register(request: RegisterRequest): Observable<ApiResponse<RegisterResponseData>> {
        return this.http.post<ApiResponse<RegisterResponseData>>(`${this.apiUrl}/register`, request);
    }

    login(request: LoginRequest): Observable<ApiResponse<LoginResponseData>> {
        return this.http.post<ApiResponse<LoginResponseData>>(`${this.apiUrl}/login`, request);
    }
}
