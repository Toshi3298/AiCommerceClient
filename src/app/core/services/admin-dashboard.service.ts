import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminDashboardData } from '../models/admin-dashboard.models';
import { ApiResponse } from '../models/api-response';
import { environment } from '../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiBaseUrl}/admin/dashboard`;
    getDashboard(): Observable<ApiResponse<AdminDashboardData>> {
        return this.http.get<ApiResponse<AdminDashboardData>>(this.apiUrl);
    }
}
