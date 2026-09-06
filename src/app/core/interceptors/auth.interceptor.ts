import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
const API_URL = environment.apiBaseUrl;
const PUBLIC_AUTH_ENDPOINTS = [`${API_URL}/auth/login`, `${API_URL}/auth/register`];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const targetsApi = request.url === API_URL || request.url.startsWith(`${API_URL}/`);
    const isPublicAuthRequest = PUBLIC_AUTH_ENDPOINTS.some((endpoint) => request.url === endpoint);

    if (!targetsApi || isPublicAuthRequest) return next(request);

    const token = sessionStorage.getItem('access_token');
    if (!token) return next(request);

    return next(
        request.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        })
    );
};
