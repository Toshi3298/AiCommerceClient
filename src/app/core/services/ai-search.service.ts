import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AiSearchRequest, AiSearchResponseData } from '../models/ai-search.models';
import { ApiResponse } from '../models/api-response';

@Injectable({ providedIn: 'root' })
export class AiSearchService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:5041/api/ai-search';

    searchProducts(request: AiSearchRequest): Observable<ApiResponse<AiSearchResponseData>> {
        return this.http.post<ApiResponse<AiSearchResponseData>>(this.apiUrl, request);
    }
}
