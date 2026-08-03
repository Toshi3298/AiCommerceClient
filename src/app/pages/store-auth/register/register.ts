import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../../core/models/api-response';
import { RegisterRequest, RegisterResponseData } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmation = group.get('passwordConfirmation')?.value;
    return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
};

@Component({
    selector: 'app-store-register',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
    templateUrl: './register.html',
    styleUrl: './register.scss'
})
export class StoreRegister {
    readonly form;
    readonly isSubmitting = signal(false);
    readonly apiErrors = signal<string[]>([]);

    constructor(
        private readonly formBuilder: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router
    ) {
        this.form = this.formBuilder.nonNullable.group(
            {
                firstName: ['', Validators.required],
                lastName: ['', Validators.required],
                email: ['', [Validators.required, Validators.email]],
                password: ['', [Validators.required, Validators.minLength(8)]],
                passwordConfirmation: ['', Validators.required]
            },
            { validators: passwordsMatch }
        );
    }

    showError(controlName: 'firstName' | 'lastName' | 'email' | 'password' | 'passwordConfirmation', error: string): boolean {
        const control = this.form.controls[controlName];
        return control.hasError(error) && (control.dirty || control.touched);
    }

    showPasswordMismatch(): boolean {
        const control = this.form.controls.passwordConfirmation;
        return this.form.hasError('passwordMismatch') && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (this.isSubmitting()) return;

        this.apiErrors.set([]);
        this.isSubmitting.set(true);

        const { firstName, lastName, email, password } = this.form.getRawValue();
        const request: RegisterRequest = { firstName, lastName, email, password };

        this.authService
            .register(request)
            .pipe(finalize(() => this.isSubmitting.set(false)))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        void this.router.navigate(['/login']);
                        return;
                    }

                    this.apiErrors.set(this.responseErrors(response));
                },
                error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
            });
    }

    private responseErrors(response: ApiResponse<RegisterResponseData>): string[] {
        if (response.errors?.length) return response.errors;
        return [response.message || 'Kayıt işlemi tamamlanamadı.'];
    }

    private httpErrors(error: HttpErrorResponse): string[] {
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        if (response?.errors?.length) return response.errors;
        if (response?.message) return [response.message];
        return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
    }
}
