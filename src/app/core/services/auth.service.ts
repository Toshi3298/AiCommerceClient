import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { CurrentUser, LoginRequest, LoginResponseData, RegisterRequest, RegisterResponseData } from '../models/auth.models';

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

    getCurrentUser(): Observable<ApiResponse<CurrentUser>> {
        return this.http.get<ApiResponse<CurrentUser>>(`${this.apiUrl}/me`);
    }

    hasToken(): boolean {
        const token = sessionStorage.getItem('access_token');
        const expiresAt = sessionStorage.getItem('token_expires_at');
        const expirationTime = expiresAt ? Date.parse(expiresAt) : Number.NaN;

        if (!token || !expiresAt || !Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
            this.logout();
            return false;
        }

        return true;
    }

    logout(): void {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('token_expires_at');
    }
}
