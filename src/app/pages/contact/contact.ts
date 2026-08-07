import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
    templateUrl: './contact.html',
    styleUrl: './contact.scss'
})
export class Contact {
    readonly formNotice = signal('');
    readonly form;

    constructor(private readonly formBuilder: FormBuilder) {
        this.form = this.formBuilder.nonNullable.group({
            adSoyad: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            email: ['', [Validators.required, Validators.email]],
            konu: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
            mesaj: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
        });
    }

    submit(): void {
        this.formNotice.set('');
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.formNotice.set('İletişim formu henüz backend servisine bağlı değildir.');
    }

    showError(controlName: keyof typeof this.form.controls, error: string): boolean {
        const control = this.form.controls[controlName];
        return control.touched && control.hasError(error);
    }
}
