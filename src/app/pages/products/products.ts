import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { Category, Product, ProductFilter, ProductListResponseData } from '../../core/models/product.models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ProductImage } from '../../shared/product-image/product-image';
import { ProductQuickView } from '../../shared/product-quick-view/product-quick-view';

type StockFilter = 'all' | 'true' | 'false';
type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'createdat-desc' | 'createdat-asc';

const DEFAULT_FILTER: ProductFilter = { sortBy: 'name', sortDirection: 'asc', pageNumber: 1, pageSize: 10 };
const SORT_VALUES: Record<SortOption, Pick<ProductFilter, 'sortBy' | 'sortDirection'>> = {
    'name-asc': { sortBy: 'name', sortDirection: 'asc' },
    'name-desc': { sortBy: 'name', sortDirection: 'desc' },
    'price-asc': { sortBy: 'price', sortDirection: 'asc' },
    'price-desc': { sortBy: 'price', sortDirection: 'desc' },
    'stock-asc': { sortBy: 'stock', sortDirection: 'asc' },
    'stock-desc': { sortBy: 'stock', sortDirection: 'desc' },
    'createdat-desc': { sortBy: 'createdat', sortDirection: 'desc' },
    'createdat-asc': { sortBy: 'createdat', sortDirection: 'asc' }
};

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, ProgressSpinnerModule, ProductImage, ProductQuickView],
    templateUrl: './products.html',
    styleUrl: './products.scss'
})
export class Products implements OnInit {
    @ViewChild(ProductQuickView) private quickView?: ProductQuickView;
    readonly categories = signal<Category[]>([]);
    readonly result = signal<ProductListResponseData | null>(null);
    readonly isLoading = signal(false);
    readonly isCategoriesLoading = signal(false);
    readonly addingProductIds = signal<ReadonlySet<number>>(new Set<number>());
    readonly apiErrors = signal<string[]>([]);
    readonly categoryError = signal('');
    readonly successMessage = signal('');
    readonly activeFilter = signal<ProductFilter>({ ...DEFAULT_FILTER });
    readonly pageNumbers = computed(() => Array.from({ length: this.result()?.totalPages ?? 0 }, (_, index) => index + 1));
    readonly sortOptions: { label: string; value: SortOption }[] = [
        { label: 'Ada göre A-Z', value: 'name-asc' }, { label: 'Ada göre Z-A', value: 'name-desc' },
        { label: 'Fiyat artan', value: 'price-asc' }, { label: 'Fiyat azalan', value: 'price-desc' },
        { label: 'Stok artan', value: 'stock-asc' }, { label: 'Stok azalan', value: 'stock-desc' },
        { label: 'En yeniler', value: 'createdat-desc' }, { label: 'En eskiler', value: 'createdat-asc' }
    ];
    readonly filterForm;

    constructor(
        private readonly formBuilder: FormBuilder,
        private readonly productService: ProductService,
        private readonly cartService: CartService,
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly route: ActivatedRoute
    ) {
        this.filterForm = this.formBuilder.group({
            search: this.formBuilder.nonNullable.control(''),
            brand: this.formBuilder.nonNullable.control(''),
            categoryId: this.formBuilder.control<number | null>(null),
            minPrice: this.formBuilder.control<number | null>(null, Validators.min(0)),
            maxPrice: this.formBuilder.control<number | null>(null, Validators.min(0)),
            inStock: this.formBuilder.nonNullable.control<StockFilter>('all'),
            sort: this.formBuilder.nonNullable.control<SortOption>('name-asc'),
            pageSize: this.formBuilder.nonNullable.control(10)
        });
    }

    ngOnInit(): void {
        this.loadCategories();
        this.route.queryParamMap
            .pipe(
                map((params) => {
                    const rawCategoryId = params.get('categoryId') ?? '';
                    const parsedCategoryId = /^\d+$/.test(rawCategoryId) ? Number(rawCategoryId) : null;
                    return {
                        search: params.get('search')?.trim() ?? '',
                        categoryId: parsedCategoryId && Number.isSafeInteger(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : null
                    };
                }),
                distinctUntilChanged((previous, current) => previous.search === current.search && previous.categoryId === current.categoryId)
            )
            .subscribe(({ search, categoryId }) => {
                this.filterForm.patchValue({ search, categoryId });
                this.activeFilter.set(this.createFilter(1));
                this.clearMessages();
                this.loadProducts();
            });
    }

    applyFilters(): void {
        this.clearMessages();
        const { minPrice, maxPrice } = this.filterForm.getRawValue();
        if (this.filterForm.invalid) {
            this.filterForm.markAllAsTouched();
            this.apiErrors.set(['Fiyat alanlarına sıfır veya daha büyük değerler girin.']);
            return;
        }
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            this.apiErrors.set(['Minimum fiyat, maksimum fiyattan büyük olamaz.']);
            return;
        }

        this.activeFilter.set(this.createFilter(1));
        this.loadProducts();
    }

    resetFilters(): void {
        if (this.isLoading()) return;
        this.filterForm.reset({ search: '', brand: '', categoryId: null, minPrice: null, maxPrice: null, inStock: 'all', sort: 'name-asc', pageSize: 10 });
        this.activeFilter.set({ ...DEFAULT_FILTER });
        this.clearMessages();
        this.loadProducts();
    }

    pageSizeChanged(): void {
        if (this.isLoading()) return;
        this.activeFilter.set({ ...this.activeFilter(), pageNumber: 1, pageSize: this.filterForm.controls.pageSize.value });
        this.clearMessages();
        this.loadProducts();
    }

    changePage(pageNumber: number): void {
        const totalPages = this.result()?.totalPages ?? 0;
        if (this.isLoading() || pageNumber < 1 || pageNumber > totalPages || pageNumber === this.activeFilter().pageNumber) return;
        this.activeFilter.set({ ...this.activeFilter(), pageNumber });
        this.clearMessages();
        this.loadProducts();
        document.getElementById('product-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    addToCart(product: Product): void {
        if (!this.authService.hasToken()) {
            void this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
            return;
        }
        if (this.isAdding(product.id) || product.stock <= 0 || !product.isActive) return;

        this.clearMessages();
        this.setAdding(product.id, true);
        this.cartService
            .addItem({ productId: product.id, quantity: 1 })
            .pipe(finalize(() => this.setAdding(product.id, false)))
            .subscribe({
                next: (response) => {
                    if (response.success) this.successMessage.set('Ürün sepete eklendi.');
                    else this.apiErrors.set(this.responseErrors(response));
                },
                error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
            });
    }

    isAdding(productId: number): boolean {
        return this.addingProductIds().has(productId);
    }

    openQuickView(productId: number, event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        const opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        this.quickView?.open(productId, opener);
    }

    private createFilter(pageNumber: number): ProductFilter {
        const value = this.filterForm.getRawValue();
        const sort = SORT_VALUES[value.sort];
        return {
            search: value.search.trim() || undefined,
            brand: value.brand.trim() || undefined,
            categoryId: value.categoryId ?? undefined,
            minPrice: value.minPrice ?? undefined,
            maxPrice: value.maxPrice ?? undefined,
            inStock: value.inStock === 'all' ? undefined : value.inStock === 'true',
            sortBy: sort.sortBy,
            sortDirection: sort.sortDirection,
            pageNumber,
            pageSize: value.pageSize
        };
    }

    private loadProducts(): void {
        if (this.isLoading()) return;
        this.isLoading.set(true);
        this.productService.getProducts(this.activeFilter()).pipe(finalize(() => this.isLoading.set(false))).subscribe({
            next: (response) => {
                if (response.success && response.data && Array.isArray(response.data.items)) this.result.set(response.data);
                else this.apiErrors.set(this.responseErrors(response));
            },
            error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error))
        });
    }

    private loadCategories(): void {
        this.isCategoriesLoading.set(true);
        this.productService.getCategories().pipe(finalize(() => this.isCategoriesLoading.set(false))).subscribe({
            next: (response) => {
                if (response.success && Array.isArray(response.data)) this.categories.set(response.data);
                else this.categoryError.set(this.responseErrors(response)[0]);
            },
            error: () => this.categoryError.set('Kategoriler yüklenemedi.')
        });
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        if (response.errors?.length) return response.errors;
        return [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'];
    }

    private httpErrors(error: HttpErrorResponse): string[] {
        if (error.status === 0) return ['Ürün servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'];
    }

    private clearMessages(): void {
        this.apiErrors.set([]);
        this.successMessage.set('');
    }

    private setAdding(productId: number, adding: boolean): void {
        const ids = new Set(this.addingProductIds());
        adding ? ids.add(productId) : ids.delete(productId);
        this.addingProductIds.set(ids);
    }
}
