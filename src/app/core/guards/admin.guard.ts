import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const loginUrl = () =>
        router.createUrlTree(['/login'], {
            queryParams: {
                returnUrl: state.url
            }
        });

    if (!authService.hasToken()) {
        return loginUrl();
    }

    return authService.getCurrentUser().pipe(
        map((response) => {
            const isAdmin =
                response.success &&
                response.data?.role
                    ?.toLowerCase() === 'admin';

            return isAdmin
                ? true
                : router.createUrlTree(['/']);
        }),

        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                authService.logout();
                return of(loginUrl());
            }

            return of(router.createUrlTree(['/']));
        })
    );
};