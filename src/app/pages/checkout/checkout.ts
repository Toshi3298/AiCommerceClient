import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { CartResponseData } from '../../core/models/cart.models';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';

const nonWhitespace = (control: AbstractControl): ValidationErrors | null => control.value?.trim() ? null : { whitespace: true };

@Component({ selector: 'app-checkout', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, ProgressSpinnerModule], templateUrl: './checkout.html', styleUrl: './checkout.scss' })
export class Checkout implements OnInit {
    readonly cart = signal<CartResponseData | null>(null);
    readonly isLoading = signal(true);
    readonly isSubmitting = signal(false);
    readonly apiErrors = signal<string[]>([]);
    readonly form;

    constructor(private readonly formBuilder: FormBuilder, private readonly cartService: CartService, private readonly orderService: OrderService, private readonly router: Router) {
        this.form = this.formBuilder.nonNullable.group({ shippingAddress: ['', [Validators.required, nonWhitespace, Validators.minLength(10), Validators.maxLength(500)]] });
    }

    ngOnInit(): void { this.loadCart(); }
    showError(error: string): boolean { const control = this.form.controls.shippingAddress; return control.hasError(error) && (control.dirty || control.touched); }

    submit(): void {
        if (this.isSubmitting() || !this.cart()?.items.length) return;
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        const shippingAddress = this.form.controls.shippingAddress.value.trim();
        if (shippingAddress.length < 10) { this.form.controls.shippingAddress.setErrors({ minlength: true }); this.form.controls.shippingAddress.markAsTouched(); return; }
        this.apiErrors.set([]); this.isSubmitting.set(true);
        this.orderService.createOrder({ shippingAddress }).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
            next: (response) => {
                if (response.success && response.data?.orderId > 0) void this.router.navigate(['/orders', response.data.orderId], { state: { orderCreated: true } });
                else this.apiErrors.set(this.responseErrors(response));
            },
            error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
        });
    }

    private loadCart(): void {
        this.cartService.getCart().pipe(finalize(() => this.isLoading.set(false))).subscribe({
            next: (response) => response.success && response.data ? this.cart.set(response.data) : this.apiErrors.set(this.responseErrors(response)),
            error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
        });
    }
    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] { return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı.']; }
    private httpErrors(error: HttpErrorResponse): string[] { if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.']; const response = error.error as Partial<ApiResponse<unknown>> | null; return response ? this.responseErrors(response) : ['Sipariş oluşturulurken bir hata oluştu.']; }
}
