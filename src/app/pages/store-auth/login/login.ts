import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response';
import { LoginRequest, LoginResponseData } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-store-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class StoreLogin {
    readonly form;
    readonly isSubmitting = signal(false);
    readonly apiErrors = signal<string[]>([]);

    constructor(
        private readonly formBuilder: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router
    ) {
        this.form = this.formBuilder.nonNullable.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]]
        });
    }

    showError(controlName: 'email' | 'password', error: string): boolean {
        const control = this.form.controls[controlName];
        return control.hasError(error) && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (this.isSubmitting()) return;

        this.apiErrors.set([]);
        this.isSubmitting.set(true);

        const request: LoginRequest = this.form.getRawValue();
        this.authService
            .login(request)
            .pipe(finalize(() => this.isSubmitting.set(false)))
            .subscribe({
                next: (response) => this.handleResponse(response),
                error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
            });
    }

    private handleResponse(response: ApiResponse<LoginResponseData>): void {
        if (response.success && response.data?.token && response.data.expiresAt) {
            sessionStorage.setItem('access_token', response.data.token);
            sessionStorage.setItem('token_expires_at', response.data.expiresAt);
            void this.router.navigate(['/']);
            return;
        }

        this.apiErrors.set(this.responseErrors(response));
    }

    private responseErrors(response: ApiResponse<LoginResponseData>): string[] {
        if (response.errors?.length) return response.errors;
        return [response.message || 'Giriş işlemi tamamlanamadı.'];
    }

    private httpErrors(error: HttpErrorResponse): string[] {
        if (error.status === 401) return ['E-posta veya şifre hatalı.'];
        if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];

        const response = error.error as Partial<ApiResponse<unknown>> | null;
        if (response?.errors?.length) return response.errors;
        if (response?.message) return [response.message];
        return ['Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }
}
