import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { Product } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ProductImage } from '../../shared/product-image/product-image';

@Component({
    selector: 'app-product-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, ProgressSpinnerModule, ProductImage],
    templateUrl: './product-detail.html',
    styleUrl: './product-detail.scss'
})
export class ProductDetail implements OnInit {
    readonly product = signal<Product | null>(null);
    readonly quantity = signal(1);
    readonly isLoading = signal(true);
    readonly isAdding = signal(false);
    readonly notFound = signal(false);
    readonly loadErrors = signal<string[]>([]);
    readonly cartErrors = signal<string[]>([]);
    readonly successMessage = signal('');

    private productId: number | null = null;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly productService: ProductService,
        private readonly cartService: CartService,
        private readonly authService: AuthService
    ) {}

    ngOnInit(): void {
        const rawId = this.route.snapshot.paramMap.get('id') ?? '';
        if (!/^\d+$/.test(rawId)) {
            this.showNotFound();
            return;
        }

        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            this.showNotFound();
            return;
        }

        this.productId = id;
        this.loadProduct(id);
    }

    decreaseQuantity(): void {
        this.quantity.update((quantity) => Math.max(1, quantity - 1));
    }

    increaseQuantity(): void {
        const stock = this.product()?.stock ?? 0;
        this.quantity.update((quantity) => Math.min(stock, quantity + 1));
    }

    addToCart(): void {
        const product = this.product();
        if (!product || this.isAdding() || !this.canAddToCart(product)) return;

        if (!this.authService.hasToken()) {
            void this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${product.id}` } });
            return;
        }

        this.cartErrors.set([]);
        this.successMessage.set('');
        this.isAdding.set(true);
        this.cartService
            .addItem({ productId: product.id, quantity: this.quantity() })
            .pipe(finalize(() => this.isAdding.set(false)))
            .subscribe({
                next: (response) => {
                    if (response.success) this.successMessage.set(response.message || 'Ürün sepete eklendi.');
                    else this.cartErrors.set(this.responseErrors(response));
                },
                error: (error: HttpErrorResponse) => this.cartErrors.set(this.httpErrors(error, 'Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'))
            });
    }

    canAddToCart(product: Product): boolean {
        return product.isActive && product.stock > 0;
    }

    retry(): void {
        if (this.productId !== null && !this.isLoading()) this.loadProduct(this.productId);
    }

    private loadProduct(id: number): void {
        this.isLoading.set(true);
        this.notFound.set(false);
        this.loadErrors.set([]);
        this.productService
            .getProductById(id)
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.product.set(response.data);
                        this.quantity.set(1);
                        return;
                    }
                    this.showNotFound();
                },
                error: (error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        this.showNotFound();
                        return;
                    }
                    this.loadErrors.set(this.httpErrors(error, 'Ürün servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'));
                }
            });
    }

    private showNotFound(): void {
        this.product.set(null);
        this.notFound.set(true);
        this.isLoading.set(false);
        this.loadErrors.set([]);
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        if (response.errors?.length) return response.errors;
        return [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'];
    }

    private httpErrors(error: HttpErrorResponse, networkMessage: string): string[] {
        if (error.status === 0) return [networkMessage];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }
}
