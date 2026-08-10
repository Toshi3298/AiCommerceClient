import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { finalize, of, switchMap } from 'rxjs';
import { AdminProductFilter, CreateProductRequest, UpdateProductRequest } from '../../core/models/admin-product.models';
import { ApiResponse } from '../../core/models/api-response';
import { Category, Product, ProductListResponseData } from '../../core/models/product.models';
import { AdminProductService } from '../../core/services/admin-product.service';
import { ProductImage } from '../../shared/product-image/product-image';

type DialogMode = 'create' | 'edit';
type TagSeverity = 'success' | 'warn' | 'danger' | 'secondary';

@Component({
    selector: 'app-admin-products',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CheckboxModule,
        ConfirmDialogModule,
        DialogModule,
        InputNumberModule,
        InputTextModule,
        PaginatorModule,
        ProgressSpinnerModule,
        SelectModule,
        TableModule,
        TagModule,
        TextareaModule,
        ToastModule,
        ProductImage
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './admin-products.html',
    styleUrl: './admin-products.scss'
})
export class AdminProducts implements OnInit {
    readonly products = signal<Product[]>([]);
    readonly categories = signal<Category[]>([]);
    readonly totalCount = signal(0);
    readonly pageNumber = signal(1);
    readonly pageSize = signal(10);
    readonly isListLoading = signal(false);
    readonly listErrors = signal<string[]>([]);
    readonly dialogVisible = signal(false);
    readonly dialogMode = signal<DialogMode>('create');
    readonly isDetailLoading = signal(false);
    readonly isSaving = signal(false);
    readonly dialogErrors = signal<string[]>([]);
    readonly deactivatingIds = signal<Set<number>>(new Set());

    readonly stockOptions = [
        { label: 'Tümü', value: null },
        { label: 'Stokta', value: true },
        { label: 'Stokta değil', value: false }
    ];
    readonly activityOptions = [
        { label: 'Tümü', value: null },
        { label: 'Aktif', value: true },
        { label: 'Pasif', value: false }
    ];
    readonly sortOptions = [
        { label: 'Ada göre (A-Z)', value: 'name:asc' },
        { label: 'Ada göre (Z-A)', value: 'name:desc' },
        { label: 'Fiyat (Artan)', value: 'price:asc' },
        { label: 'Fiyat (Azalan)', value: 'price:desc' },
        { label: 'Stok (Artan)', value: 'stock:asc' },
        { label: 'Stok (Azalan)', value: 'stock:desc' },
        { label: 'En Yeni', value: 'createdat:desc' },
        { label: 'En Eski', value: 'createdat:asc' }
    ];
    readonly pageSizeOptions = [10, 20, 30];

    private readonly fb = inject(FormBuilder);
    private readonly productService = inject(AdminProductService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly destroyRef = inject(DestroyRef);
    private editingId: number | null = null;

    readonly filterForm = this.fb.group({
        search: [''],
        brand: [''],
        categoryId: [null as number | null],
        minPrice: [null as number | null],
        maxPrice: [null as number | null],
        inStock: [null as boolean | null],
        isActive: [null as boolean | null],
        sort: ['createdat:desc'],
        pageSize: [10]
    });

    readonly productForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        description: ['', Validators.maxLength(1000)],
        brand: ['', [Validators.required, Validators.maxLength(100)]],
        price: [0, [Validators.required, Validators.min(0.01)]],
        stock: [0, [Validators.required, Validators.min(0)]],
        categoryId: [0, [Validators.required, Validators.min(1)]],
        imageUrl: ['', [Validators.maxLength(2048), Validators.pattern(/^https?:\/\/\S+$/i)]],
        isActive: [true]
    });

    ngOnInit(): void {
        this.loadProducts();
        this.loadCategories();
    }

    applyFilters(): void {
        const { minPrice, maxPrice, pageSize } = this.filterForm.getRawValue();
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            this.listErrors.set(['Minimum fiyat, maksimum fiyattan büyük olamaz.']);
            return;
        }
        this.pageNumber.set(1);
        this.pageSize.set(pageSize ?? 10);
        this.loadProducts();
    }

    clearFilters(): void {
        this.filterForm.reset({ search: '', brand: '', categoryId: null, minPrice: null, maxPrice: null, inStock: null, isActive: null, sort: 'createdat:desc', pageSize: 10 });
        this.applyFilters();
    }

    onPageChange(event: PaginatorState): void {
        const nextSize = event.rows ?? this.pageSize();
        this.pageSize.set(nextSize);
        this.pageNumber.set((event.page ?? 0) + 1);
        this.filterForm.controls.pageSize.setValue(nextSize);
        this.loadProducts();
    }

    openCreateDialog(): void {
        this.dialogMode.set('create');
        this.editingId = null;
        this.dialogErrors.set([]);
        this.productForm.reset({ name: '', description: '', brand: '', price: 0, stock: 0, categoryId: 0, imageUrl: '', isActive: true });
        this.dialogVisible.set(true);
    }

    openEditDialog(id: number): void {
        if (this.isDetailLoading()) return;
        this.dialogMode.set('edit');
        this.editingId = id;
        this.dialogErrors.set([]);
        this.isDetailLoading.set(true);
        this.dialogVisible.set(true);
        this.productForm.reset({ name: '', description: '', brand: '', price: 0, stock: 0, categoryId: 0, imageUrl: '', isActive: true });

        this.productService
            .getProductById(id)
            .pipe(
                finalize(() => this.isDetailLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success || !response.data) {
                        this.dialogErrors.set(this.responseErrors(response));
                        return;
                    }
                    const product = response.data;
                    this.productForm.setValue({
                        name: product.name,
                        description: product.description,
                        brand: product.brand,
                        price: product.price,
                        stock: product.stock,
                        categoryId: product.categoryId,
                        imageUrl: product.imageUrl ?? '',
                        isActive: product.isActive
                    });
                },
                error: (error: HttpErrorResponse) => this.dialogErrors.set(this.httpErrors(error, true))
            });
    }

    saveProduct(): void {
        if (this.isSaving() || this.isDetailLoading()) return;
        this.productForm.markAllAsTouched();
        if (this.productForm.invalid) return;

        const value = this.productForm.getRawValue();
        const baseRequest: CreateProductRequest = {
            name: value.name.trim(),
            description: value.description.trim(),
            brand: value.brand.trim(),
            price: value.price,
            stock: value.stock,
            categoryId: value.categoryId,
            imageUrl: value.imageUrl.trim() || null
        };
        if (!baseRequest.name || !baseRequest.brand) {
            this.dialogErrors.set(['Ürün adı ve marka boş bırakılamaz.']);
            return;
        }

        this.isSaving.set(true);
        this.dialogErrors.set([]);
        const isCreate = this.dialogMode() === 'create';
        const request$ = isCreate ? this.productService.createProduct(baseRequest) : this.productService.updateProduct(this.editingId!, { ...baseRequest, isActive: value.isActive } satisfies UpdateProductRequest);

        request$
            .pipe(
                finalize(() => this.isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success) {
                        this.dialogErrors.set(this.responseErrors(response));
                        return;
                    }
                    this.dialogVisible.set(false);
                    this.messageService.add({ severity: 'success', summary: 'Başarılı', detail: isCreate ? 'Ürün oluşturuldu' : 'Ürün güncellendi' });
                    this.loadProducts();
                },
                error: (error: HttpErrorResponse) => this.dialogErrors.set(this.httpErrors(error))
            });
    }

    confirmDeactivate(product: Product): void {
        if (this.deactivatingIds().has(product.id)) return;
        this.confirmationService.confirm({
            header: 'Ürünü Pasife Al',
            icon: 'pi pi-exclamation-triangle',
            message: `“${product.name}” ürününü pasife almak istediğinize emin misiniz?`,
            acceptLabel: 'Pasife Al',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deactivateProduct(product.id)
        });
    }

    isDeactivating(id: number): boolean {
        return this.deactivatingIds().has(id);
    }
    stockLabel(stock: number): string {
        return stock > 0 ? 'Stokta' : 'Stokta değil';
    }
    stockSeverity(stock: number): TagSeverity {
        return stock > 0 ? 'success' : 'danger';
    }

    loadProducts(): void {
        if (this.isListLoading()) return;
        this.isListLoading.set(true);
        this.listErrors.set([]);
        this.productService
            .getProducts(this.buildFilter())
            .pipe(
                switchMap((response) => {
                    if (response.success && response.data?.items.length === 0 && this.pageNumber() > 1) {
                        this.pageNumber.update((page) => page - 1);
                        return this.productService.getProducts(this.buildFilter());
                    }
                    return of(response);
                }),
                finalize(() => this.isListLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success || !response.data) {
                        this.listErrors.set(this.responseErrors(response));
                        return;
                    }
                    this.products.set(response.data.items);
                    this.totalCount.set(response.data.totalCount);
                    this.pageNumber.set(response.data.pageNumber);
                    this.pageSize.set(response.data.pageSize);
                },
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error))
            });
    }

    private loadCategories(): void {
        this.productService
            .getCategories()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => (response.success ? this.categories.set(response.data) : this.listErrors.set(this.responseErrors(response))),
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error))
            });
    }

    private deactivateProduct(id: number): void {
        if (this.deactivatingIds().has(id)) return;
        this.deactivatingIds.update((ids) => new Set(ids).add(id));
        this.productService
            .deactivateProduct(id)
            .pipe(
                finalize(() =>
                    this.deactivatingIds.update((ids) => {
                        const next = new Set(ids);
                        next.delete(id);
                        return next;
                    })
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success) {
                        this.listErrors.set(this.responseErrors(response));
                        return;
                    }
                    this.messageService.add({ severity: 'success', summary: 'Başarılı', detail: 'Ürün pasife alındı' });
                    this.loadProducts();
                },
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error))
            });
    }

    private buildFilter(): AdminProductFilter {
        const value = this.filterForm.getRawValue();
        const [sortBy, sortDirection] = (value.sort ?? 'createdat:desc').split(':') as [AdminProductFilter['sortBy'], AdminProductFilter['sortDirection']];
        return {
            search: value.search?.trim() || undefined,
            brand: value.brand?.trim() || undefined,
            categoryId: value.categoryId ?? undefined,
            minPrice: value.minPrice ?? undefined,
            maxPrice: value.maxPrice ?? undefined,
            inStock: value.inStock ?? undefined,
            isActive: value.isActive ?? undefined,
            sortBy,
            sortDirection,
            pageNumber: this.pageNumber(),
            pageSize: this.pageSize()
        };
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı.'];
    }
    private httpErrors(error: HttpErrorResponse, detail = false): string[] {
        if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
        if (error.status === 401 || error.status === 403) return ['Bu işlem için yetkiniz bulunmuyor.'];
        if (detail && error.status === 404) return ['Ürün bulunamadı.'];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['Beklenmeyen bir hata oluştu.'];
    }
}
