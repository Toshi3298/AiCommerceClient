import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ApiResponse } from '../../core/models/api-response';
import { AiSearchResponseData } from '../../core/models/ai-search.models';
import { Product } from '../../core/models/product.models';
import { AiSearchService } from '../../core/services/ai-search.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-ai-search',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule],
    templateUrl: './ai-search.html',
    styleUrl: './ai-search.scss'
})
export class AiSearch {
    private readonly formBuilder = inject(FormBuilder);
    private readonly aiSearchService = inject(AiSearchService);
    private readonly cartService = inject(CartService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly examples = [
        '20.000 TL altındaki stokta bulunan telefonları getir',
        'Samsung telefonları fiyatı ucuzdan pahalıya sırala',
        'Stokta bulunan kitapları getir',
        'En pahalı 5 bilgisayarı getir',
        'Adidas marka spor ürünlerini getir'
    ];
    readonly form = this.formBuilder.group({
        prompt: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(500)])
    });
    readonly result = signal<AiSearchResponseData | null>(null);
    readonly isLoading = signal(false);
    readonly hasSearched = signal(false);
    readonly errors = signal<string[]>([]);
    readonly successMessage = signal('');
    readonly cartErrors = signal<string[]>([]);
    readonly cartSuccessMessage = signal('');
    readonly addingProductIds = signal<ReadonlySet<number>>(new Set<number>());

    get promptControl() { return this.form.controls.prompt; }

    selectExample(example: string): void {
        this.promptControl.setValue(example);
        this.promptControl.markAsTouched();
        this.promptControl.updateValueAndValidity();
    }

    handleShortcut(event: KeyboardEvent): void {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            this.search();
        }
    }

    search(): void {
        if (this.isLoading()) return;
        const prompt = this.promptControl.value.trim();
        this.promptControl.setValue(prompt);
        this.promptControl.markAsTouched();
        this.promptControl.updateValueAndValidity();
        if (this.form.invalid) return;

        this.result.set(null);
        this.errors.set([]);
        this.successMessage.set('');
        this.cartErrors.set([]);
        this.cartSuccessMessage.set('');
        this.hasSearched.set(true);
        this.isLoading.set(true);
        this.aiSearchService.searchProducts({ prompt })
            .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    if (response.success && response.data && Array.isArray(response.data.products)) {
                        this.result.set(response.data);
                        this.successMessage.set(response.message || 'AI ürün araması başarıyla tamamlandı.');
                        return;
                    }
                    this.errors.set(this.responseErrors(response));
                },
                error: (error: HttpErrorResponse) => this.errors.set(this.aiErrors(error))
            });
    }

    addToCart(product: Product): void {
        if (this.isAdding(product.id) || product.stock <= 0 || !product.isActive) return;
        if (!this.authService.hasToken()) {
            void this.router.navigate(['/login'], { queryParams: { returnUrl: '/ai-search' } });
            return;
        }

        this.cartErrors.set([]);
        this.cartSuccessMessage.set('');
        this.setAdding(product.id, true);
        this.cartService.addItem({ productId: product.id, quantity: 1 })
            .pipe(finalize(() => this.setAdding(product.id, false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => response.success
                    ? this.cartSuccessMessage.set(response.message || 'Ürün sepete eklendi.')
                    : this.cartErrors.set(this.responseErrors(response)),
                error: (error: HttpErrorResponse) => this.cartErrors.set(this.cartHttpErrors(error))
            });
    }

    isAdding(productId: number): boolean { return this.addingProductIds().has(productId); }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'];
    }

    private aiErrors(error: HttpErrorResponse): string[] {
        if (error.status === 400) {
            const response = error.error as Partial<ApiResponse<unknown>> | null;
            return response ? this.responseErrors(response) : ['Arama isteği geçersiz. Lütfen metni kontrol edin.'];
        }
        return ['AI arama servisine şu anda ulaşılamıyor. Backend ve Ollama servisinin çalıştığını kontrol edin.'];
    }

    private cartHttpErrors(error: HttpErrorResponse): string[] {
        if (error.status === 0) return ['Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['Sepet işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }

    private setAdding(productId: number, adding: boolean): void {
        const ids = new Set(this.addingProductIds());
        adding ? ids.add(productId) : ids.delete(productId);
        this.addingProductIds.set(ids);
    }
}
