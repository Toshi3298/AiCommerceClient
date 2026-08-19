import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BiaChatRequest, BiaChatResponseData } from '../models/bia-agent.models';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class BiaAgentService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/bia/chat';

    chat(request: BiaChatRequest): Observable<ApiResponse<BiaChatResponseData>> {
        return this.http.post<ApiResponse<BiaChatResponseData>>(this.apiUrl, request);
    }
}
