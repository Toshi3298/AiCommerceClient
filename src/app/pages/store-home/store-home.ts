import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { Category, Product, ProductFilter } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { CurrentUser } from '../../core/models/auth.models';
import { ProductSearchAutocomplete } from '../../shared/product-search-autocomplete/product-search-autocomplete';

interface HeroSlide {
    eyebrow: string;
    title: string;
    description: string;
    icon: string;
    categoryId?: number;
}

const FEATURED_FILTER: ProductFilter = { inStock: true, sortBy: 'price', sortDirection: 'desc', pageNumber: 1, pageSize: 8 };
const EXPLORE_FILTER: ProductFilter = { inStock: true, sortBy: 'name', sortDirection: 'asc', pageNumber: 1, pageSize: 8 };
const NEW_FILTER: ProductFilter = { sortBy: 'createdAt', sortDirection: 'desc', pageNumber: 1, pageSize: 4 };

@Component({
    selector: 'app-store-home',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, ProductSearchAutocomplete],
    templateUrl: './store-home.html',
    styleUrl: './store-home.scss'
})
export class StoreHome implements OnInit, OnDestroy {
    private readonly authService = inject(AuthService);
    private readonly productService = inject(ProductService);
    private readonly cartService = inject(CartService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private sliderTimer: ReturnType<typeof setInterval> | null = null;

    readonly menuOpen = signal(false);
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly categories = signal<Category[]>([]);
    readonly featuredProducts = signal<Product[]>([]);
    readonly exploreProducts = signal<Product[]>([]);
    readonly newProducts = signal<Product[]>([]);
    readonly categoriesLoading = signal(true);
    readonly featuredLoading = signal(true);
    readonly exploreLoading = signal(true);
    readonly newLoading = signal(true);
    readonly categoriesError = signal('');
    readonly featuredError = signal('');
    readonly exploreError = signal('');
    readonly newError = signal('');
    readonly addingProductIds = signal<ReadonlySet<number>>(new Set<number>());
    readonly actionErrors = signal<string[]>([]);
    readonly successMessage = signal('');
    readonly activeSlide = signal(0);
    readonly featuredIndex = signal(0);
    readonly exploreIndex = signal(0);
    readonly year = new Date().getFullYear();

    readonly heroSlides = computed<HeroSlide[]>(() => {
        const firstCategory = this.categories()[0];
        return [
            { eyebrow: 'Bicep ürün kataloğu', title: 'Aradığınız ürünleri kolayca keşfedin', description: 'Kategori, marka, fiyat ve stok seçenekleriyle kataloğu inceleyin.', icon: 'pi-shopping-bag' },
            { eyebrow: 'Yeni ürünler', title: 'Kataloğa yeni eklenenlere göz atın', description: 'Mağazamıza eklenen en güncel ürünleri tek yerde görün.', icon: 'pi-sparkles' },
            { eyebrow: firstCategory ? firstCategory.name : 'Kategoriler', title: 'İhtiyacınıza uygun kategoriyi keşfedin', description: 'Gerçek kategori seçenekleri üzerinden ürünlere hızlıca ulaşın.', icon: this.categoryIcon(firstCategory?.name), categoryId: firstCategory?.id }
        ];
    });
    readonly selectedProducts = computed(() => this.exploreProducts().slice(0, 4));
    readonly visibleFeatured = computed(() => this.featuredProducts().slice(this.featuredIndex(), this.featuredIndex() + 4));
    readonly visibleExplore = computed(() => this.exploreProducts().slice(this.exploreIndex(), this.exploreIndex() + 4));

    ngOnInit(): void {
        this.loadCategories();
        this.loadProducts(FEATURED_FILTER, this.featuredProducts, this.featuredLoading, this.featuredError);
        this.loadProducts(EXPLORE_FILTER, this.exploreProducts, this.exploreLoading, this.exploreError);
        this.loadProducts(NEW_FILTER, this.newProducts, this.newLoading, this.newError);
        this.loadCurrentUser();
        this.startSlider();
    }

    ngOnDestroy(): void {
        if (this.sliderTimer) clearInterval(this.sliderTimer);
    }

    logout(): void {
        this.authService.logout();
        this.currentUser.set(null);
        this.menuOpen.set(false);
    }

    toggleMenu(): void { this.menuOpen.update((open) => !open); }

    previousSlide(): void {
        this.activeSlide.update((index) => (index - 1 + this.heroSlides().length) % this.heroSlides().length);
        this.restartSlider();
    }

    nextSlide(): void {
        this.activeSlide.update((index) => (index + 1) % this.heroSlides().length);
        this.restartSlider();
    }

    goToSlide(index: number): void {
        this.activeSlide.set(index);
        this.restartSlider();
    }

    moveFeatured(direction: -1 | 1): void {
        const max = Math.max(0, this.featuredProducts().length - 4);
        this.featuredIndex.update((index) => Math.min(max, Math.max(0, index + direction)));
    }

    moveExplore(direction: -1 | 1): void {
        const max = Math.max(0, this.exploreProducts().length - 4);
        this.exploreIndex.update((index) => Math.min(max, Math.max(0, index + direction)));
    }

    addToCart(product: Product): void {
        if (this.isAdding(product.id) || product.stock <= 0 || !product.isActive) return;
        if (!this.authService.hasToken()) {
            void this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
            return;
        }

        this.clearMessages();
        this.setAdding(product.id, true);
        this.cartService.addItem({ productId: product.id, quantity: 1 })
            .pipe(finalize(() => this.setAdding(product.id, false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => response.success ? this.successMessage.set(response.message || 'Ürün sepete eklendi.') : this.actionErrors.set(this.responseErrors(response)),
                error: (error: HttpErrorResponse) => this.actionErrors.set(this.httpErrors(error, 'Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'))
            });
    }

    isAdding(productId: number): boolean { return this.addingProductIds().has(productId); }

    categoryIcon(name?: string): string {
        const value = (name ?? '').toLocaleLowerCase('tr-TR');
        if (value.includes('telefon')) return 'pi-mobile';
        if (value.includes('bilgisayar') || value.includes('laptop')) return 'pi-desktop';
        if (value.includes('saat')) return 'pi-clock';
        if (value.includes('kamera')) return 'pi-camera';
        if (value.includes('kulaklık') || value.includes('ses')) return 'pi-headphones';
        if (value.includes('oyun')) return 'pi-microchip';
        if (value.includes('giyim')) return 'pi-shopping-bag';
        return 'pi-tag';
    }

    private loadCategories(): void {
        this.productService.getCategories().pipe(finalize(() => this.categoriesLoading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response) => {
                if (response.success && Array.isArray(response.data)) this.categories.set(response.data);
                else this.categoriesError.set(this.responseErrors(response)[0]);
            },
            error: (error: HttpErrorResponse) => this.categoriesError.set(this.httpErrors(error, 'Kategoriler yüklenemedi. Lütfen bağlantınızı kontrol edin.')[0])
        });
    }

    private loadProducts(filter: ProductFilter, target: { set(value: Product[]): void }, loading: { set(value: boolean): void }, errorTarget: { set(value: string): void }): void {
        this.productService.getProducts(filter).pipe(finalize(() => loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response) => {
                if (response.success && response.data && Array.isArray(response.data.items)) target.set(response.data.items);
                else errorTarget.set(this.responseErrors(response)[0]);
            },
            error: (error: HttpErrorResponse) => errorTarget.set(this.httpErrors(error, 'Ürünler yüklenemedi. Lütfen bağlantınızı kontrol edin.')[0])
        });
    }

    private loadCurrentUser(): void {
        if (!this.authService.hasToken()) return;
        this.authService.getCurrentUser().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response) => {
                if (response.success && this.isValidUser(response.data)) this.currentUser.set(response.data);
                else this.logout();
            },
            error: (error: HttpErrorResponse) => { if (error.status === 401) this.logout(); }
        });
    }

    private startSlider(): void {
        this.sliderTimer = setInterval(() => this.activeSlide.update((index) => (index + 1) % this.heroSlides().length), 5000);
    }

    private restartSlider(): void {
        if (this.sliderTimer) clearInterval(this.sliderTimer);
        this.startSlider();
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'];
    }

    private httpErrors(error: HttpErrorResponse, networkMessage: string): string[] {
        if (error.status === 0) return [networkMessage];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }

    private clearMessages(): void { this.actionErrors.set([]); this.successMessage.set(''); }

    private setAdding(productId: number, adding: boolean): void {
        const ids = new Set(this.addingProductIds());
        adding ? ids.add(productId) : ids.delete(productId);
        this.addingProductIds.set(ids);
    }

    private isValidUser(user: CurrentUser | null | undefined): user is CurrentUser {
        return !!user && typeof user.userId === 'string' && typeof user.fullName === 'string' && typeof user.email === 'string' && typeof user.role === 'string';
    }
}
