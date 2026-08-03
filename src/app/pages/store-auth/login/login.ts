import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
    selector: 'app-store-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class StoreLogin {
    readonly form;

    constructor(private readonly formBuilder: FormBuilder) {
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
        if (this.form.invalid) this.form.markAllAsTouched();
    }
}
