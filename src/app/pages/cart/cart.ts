import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Observable, finalize, switchMap, throwError } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { CartItem, CartResponseData } from '../../core/models/cart.models';
import { CartService } from '../../core/services/cart.service';
import { ProductImage } from '../../shared/product-image/product-image';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, ProgressSpinnerModule, ProductImage],
    templateUrl: './cart.html',
    styleUrl: './cart.scss'
})
export class Cart implements OnInit {
    readonly cart = signal<CartResponseData | null>(null);
    readonly isLoading = signal(true);
    readonly isClearing = signal(false);
    readonly busyItemIds = signal<ReadonlySet<number>>(new Set<number>());
    readonly apiErrors = signal<string[]>([]);

    constructor(private readonly cartService: CartService) {}

    ngOnInit(): void {
        this.loadCart();
    }

    increase(item: CartItem): void {
        if (this.isItemBusy(item.cartItemId)) return;
        if (item.quantity >= item.availableStock) {
            this.apiErrors.set([`“${item.productName}” için mevcut stok sınırına ulaştınız.`]);
            return;
        }

        this.updateQuantity(item, item.quantity + 1);
    }

    decrease(item: CartItem): void {
        if (this.isItemBusy(item.cartItemId)) return;
        if (item.quantity === 1) {
            if (window.confirm(`“${item.productName}” ürününü sepetten kaldırmak istiyor musunuz?`)) this.remove(item, false);
            return;
        }

        this.updateQuantity(item, item.quantity - 1);
    }

    remove(item: CartItem, confirmRemoval = true): void {
        if (this.isItemBusy(item.cartItemId)) return;
        if (confirmRemoval && !window.confirm(`“${item.productName}” ürününü sepetten kaldırmak istiyor musunuz?`)) return;
        this.runItemMutation(item.cartItemId, this.cartService.removeItem(item.cartItemId));
    }

    clearCart(): void {
        if (this.isClearing() || this.busyItemIds().size > 0 || !this.cart()?.items.length) return;
        if (!window.confirm('Sepetteki tüm ürünleri kaldırmak istiyor musunuz?')) return;

        this.apiErrors.set([]);
        this.isClearing.set(true);
        this.runMutation(this.cartService.clearCart())
            .pipe(finalize(() => this.isClearing.set(false)))
            .subscribe({
                next: (response) => this.applyCartResponse(response),
                error: (error: unknown) => this.apiErrors.set(this.readErrors(error))
            });
    }

    isItemBusy(cartItemId: number): boolean {
        return this.busyItemIds().has(cartItemId);
    }

    private loadCart(): void {
        this.isLoading.set(true);
        this.apiErrors.set([]);
        this.cartService
            .getCart()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (response) => this.applyCartResponse(response),
                error: (error: HttpErrorResponse) => this.apiErrors.set(this.readErrors(error))
            });
    }

    private updateQuantity(item: CartItem, quantity: number): void {
        this.runItemMutation(item.cartItemId, this.cartService.updateItem(item.cartItemId, { quantity }));
    }

    private runItemMutation(cartItemId: number, request: Observable<ApiResponse<unknown>>): void {
        this.setItemBusy(cartItemId, true);
        this.apiErrors.set([]);
        this.runMutation(request)
            .pipe(finalize(() => this.setItemBusy(cartItemId, false)))
            .subscribe({
                next: (response) => this.applyCartResponse(response),
                error: (error: unknown) => this.apiErrors.set(this.readErrors(error))
            });
    }

    private runMutation(request: Observable<ApiResponse<unknown>>): Observable<ApiResponse<CartResponseData>> {
        return request.pipe(
            switchMap((response) => (response.success ? this.cartService.getCart() : throwError(() => response)))
        );
    }

    private applyCartResponse(response: ApiResponse<CartResponseData>): void {
        if (response.success && response.data && Array.isArray(response.data.items)) {
            this.cart.set(response.data);
            return;
        }

        this.apiErrors.set(this.responseErrors(response));
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        if (response.errors?.length) return response.errors;
        return [response.message || 'Sepet işlemi tamamlanamadı.'];
    }

    private readErrors(error: unknown): string[] {
        if (error instanceof HttpErrorResponse) {
            if (error.status === 0) return ['Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
            const response = error.error as Partial<ApiResponse<unknown>> | null;
            if (response) return this.responseErrors(response);
            return ['Sepet işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
        }

        return this.responseErrors(error as Partial<ApiResponse<unknown>>);
    }

    private setItemBusy(cartItemId: number, busy: boolean): void {
        const ids = new Set(this.busyItemIds());
        busy ? ids.add(cartItemId) : ids.delete(cartItemId);
        this.busyItemIds.set(ids);
    }
}
