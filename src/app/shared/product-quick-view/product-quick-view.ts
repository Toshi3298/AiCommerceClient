import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Subscription, finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { Product } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ProductImage } from '../product-image/product-image';

@Component({ selector: 'app-product-quick-view', standalone: true, imports: [CommonModule, ButtonModule, DialogModule, ProgressSpinnerModule, ProductImage], templateUrl: './product-quick-view.html', styleUrl: './product-quick-view.scss' })
export class ProductQuickView implements OnDestroy {
    @ViewChild('dialogFocusTarget') private dialogFocusTarget?: ElementRef<HTMLElement>;
    readonly visible = signal(false);
    readonly product = signal<Product | null>(null);
    readonly quantity = signal(1);
    readonly isLoading = signal(false);
    readonly isAdding = signal(false);
    readonly notFound = signal(false);
    readonly loadErrors = signal<string[]>([]);
    readonly cartErrors = signal<string[]>([]);
    readonly successMessage = signal('');
    private productId: number | null = null;
    private loadSubscription?: Subscription;
    private cartSubscription?: Subscription;
    private opener?: HTMLElement;

    constructor(private readonly productService: ProductService, private readonly cartService: CartService, private readonly authService: AuthService, private readonly router: Router) {}

    open(productId: number, opener?: HTMLElement): void {
        this.loadSubscription?.unsubscribe();
        this.cartSubscription?.unsubscribe();
        this.productId = productId;
        this.opener = opener;
        this.resetState();
        this.visible.set(true);
        this.loadProduct(productId);
    }

    visibleChanged(visible: boolean): void {
        this.visible.set(visible);
        if (!visible) this.afterClose();
    }

    focusDialog(): void { window.setTimeout(() => this.dialogFocusTarget?.nativeElement.focus()); }
    decreaseQuantity(): void { this.quantity.update((quantity) => Math.max(1, quantity - 1)); }
    increaseQuantity(): void { this.quantity.update((quantity) => Math.min(this.product()?.stock ?? 0, quantity + 1)); }
    canAddToCart(product: Product): boolean { return product.isActive && product.stock > 0; }

    addToCart(): void {
        const product = this.product();
        if (!product || this.isAdding() || !this.canAddToCart(product)) return;
        if (!this.authService.hasToken()) {
            const returnUrl = /^\/products(?:\?|$)/.test(this.router.url) ? this.router.url : '/products';
            this.visible.set(false);
            this.afterClose();
            void this.router.navigate(['/login'], { queryParams: { returnUrl } });
            return;
        }
        this.cartErrors.set([]);
        this.successMessage.set('');
        this.isAdding.set(true);
        this.cartSubscription = this.cartService.addItem({ productId: product.id, quantity: this.quantity() }).pipe(finalize(() => this.isAdding.set(false))).subscribe({
            next: (response) => response.success ? this.successMessage.set(response.message || 'Ürün sepete eklendi.') : this.cartErrors.set(this.responseErrors(response)),
            error: (error: HttpErrorResponse) => this.cartErrors.set(this.httpErrors(error, 'Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'))
        });
    }

    retry(): void { if (this.productId !== null && !this.isLoading()) this.loadProduct(this.productId); }

    openDetails(): void {
        const product = this.product();
        if (!product) return;
        this.visible.set(false);
        this.afterClose();
        void this.router.navigate(['/products', product.id]);
    }

    ngOnDestroy(): void { this.loadSubscription?.unsubscribe(); this.cartSubscription?.unsubscribe(); }

    private loadProduct(id: number): void {
        if (this.isLoading()) return;
        this.isLoading.set(true);
        this.notFound.set(false);
        this.loadErrors.set([]);
        this.loadSubscription = this.productService.getProductById(id).pipe(finalize(() => this.isLoading.set(false))).subscribe({
            next: (response) => {
                if (response.success && response.data) this.product.set(response.data);
                else this.loadErrors.set(this.responseErrors(response));
            },
            error: (error: HttpErrorResponse) => error.status === 404 ? this.notFound.set(true) : this.loadErrors.set(this.httpErrors(error, 'Ürün servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'))
        });
    }

    private resetState(): void {
        this.product.set(null); this.quantity.set(1); this.isLoading.set(false); this.isAdding.set(false); this.notFound.set(false);
        this.loadErrors.set([]); this.cartErrors.set([]); this.successMessage.set('');
    }

    private afterClose(): void {
        this.loadSubscription?.unsubscribe(); this.cartSubscription?.unsubscribe(); this.isLoading.set(false); this.isAdding.set(false);
        const opener = this.opener; this.opener = undefined; window.setTimeout(() => opener?.focus());
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] { return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.']; }
    private httpErrors(error: HttpErrorResponse, networkMessage: string): string[] {
        if (error.status === 0) return [networkMessage];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }
}
