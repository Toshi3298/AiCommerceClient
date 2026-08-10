import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminDashboardData } from '../models/admin-dashboard.models';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/admin/dashboard';

    getDashboard(): Observable<ApiResponse<AdminDashboardData>> {
        return this.http.get<ApiResponse<AdminDashboardData>>(this.apiUrl);
    }
}
