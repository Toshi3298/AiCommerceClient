import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

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

    constructor(private readonly formBuilder: FormBuilder) {
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
        if (this.form.invalid) this.form.markAllAsTouched();
    }
}
