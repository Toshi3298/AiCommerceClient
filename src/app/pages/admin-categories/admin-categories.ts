import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { AdminCategory, CreateCategoryRequest, UpdateCategoryRequest } from '../../core/models/admin-category.models';
import { ApiResponse } from '../../core/models/api-response';
import { AdminCategoryService } from '../../core/services/admin-category.service';

type DialogMode = 'create' | 'edit';

@Component({
    selector: 'app-admin-categories',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, TableModule, TextareaModule, ToastModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './admin-categories.html',
    styleUrl: './admin-categories.scss'
})
export class AdminCategories implements OnInit {
    readonly categories = signal<AdminCategory[]>([]);
    readonly searchTerm = signal('');
    readonly filteredCategories = computed(() => {
        const search = this.searchTerm().trim().toLocaleLowerCase('tr-TR');
        if (!search) return this.categories();
        return this.categories().filter((category) => `${category.name} ${category.description ?? ''}`.toLocaleLowerCase('tr-TR').includes(search));
    });
    readonly isLoading = signal(false);
    readonly listErrors = signal<string[]>([]);
    readonly dialogVisible = signal(false);
    readonly dialogMode = signal<DialogMode>('create');
    readonly isSaving = signal(false);
    readonly dialogErrors = signal<string[]>([]);
    readonly deletingIds = signal<Set<number>>(new Set());

    private readonly fb = inject(FormBuilder);
    private readonly categoryService = inject(AdminCategoryService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly destroyRef = inject(DestroyRef);
    private editingId: number | null = null;

    readonly categoryForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        description: ['', Validators.maxLength(500)]
    });

    ngOnInit(): void {
        this.loadCategories();
    }

    updateSearch(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value);
    }

    openCreateDialog(): void {
        this.dialogMode.set('create');
        this.editingId = null;
        this.dialogErrors.set([]);
        this.categoryForm.reset({ name: '', description: '' });
        this.dialogVisible.set(true);
    }

    openEditDialog(category: AdminCategory): void {
        if (this.isDeleting(category.id)) return;
        this.dialogMode.set('edit');
        this.editingId = category.id;
        this.dialogErrors.set([]);
        this.categoryForm.reset({ name: category.name, description: category.description ?? '' });
        this.dialogVisible.set(true);
    }

    saveCategory(): void {
        if (this.isSaving()) return;
        this.categoryForm.markAllAsTouched();
        if (this.categoryForm.invalid) return;

        const value = this.categoryForm.getRawValue();
        const request: CreateCategoryRequest = { name: value.name.trim(), description: value.description.trim() || null };
        if (!request.name) {
            this.dialogErrors.set(['Kategori adı boş bırakılamaz.']);
            return;
        }

        this.isSaving.set(true);
        this.dialogErrors.set([]);
        const isCreate = this.dialogMode() === 'create';
        const request$ = isCreate ? this.categoryService.createCategory(request) : this.categoryService.updateCategory(this.editingId!, request satisfies UpdateCategoryRequest);

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
                    this.messageService.add({ severity: 'success', summary: 'Başarılı', detail: isCreate ? 'Kategori oluşturuldu' : 'Kategori güncellendi' });
                    this.loadCategories();
                },
                error: (error: HttpErrorResponse) => this.dialogErrors.set(this.httpErrors(error))
            });
    }

    confirmDelete(category: AdminCategory): void {
        if (this.isDeleting(category.id)) return;
        this.confirmationService.confirm({
            header: 'Kategoriyi Sil',
            icon: 'pi pi-exclamation-triangle',
            message: `“${category.name}” kategorisini silmek istediğinize emin misiniz?`,
            acceptLabel: 'Sil',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.deleteCategory(category.id)
        });
    }

    isDeleting(id: number): boolean {
        return this.deletingIds().has(id);
    }

    loadCategories(): void {
        if (this.isLoading()) return;
        this.isLoading.set(true);
        this.listErrors.set([]);
        this.categoryService
            .getCategories()
            .pipe(
                finalize(() => this.isLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success || !Array.isArray(response.data)) {
                        this.listErrors.set(this.responseErrors(response));
                        return;
                    }
                    this.categories.set(response.data);
                },
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error))
            });
    }

    private deleteCategory(id: number): void {
        if (this.isDeleting(id)) return;
        this.deletingIds.update((ids) => new Set(ids).add(id));
        this.listErrors.set([]);
        this.categoryService
            .deleteCategory(id)
            .pipe(
                finalize(() =>
                    this.deletingIds.update((ids) => {
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
                    this.messageService.add({ severity: 'success', summary: 'Başarılı', detail: 'Kategori silindi' });
                    this.loadCategories();
                },
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error, true))
            });
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı.'];
    }

    private httpErrors(error: HttpErrorResponse, deleting = false): string[] {
        if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
        if (error.status === 401 || error.status === 403) return ['Bu işlem için yetkiniz bulunmuyor.'];

        const response = error.error as Partial<ApiResponse<unknown>> | null;
        if (response?.errors?.length || response?.message) return this.responseErrors(response);
        if (deleting && error.status === 409) return ['Bu kategori ürünlerde kullanıldığı için silinemez.'];
        if (error.status === 404) return ['Kategori bulunamadı.'];
        return ['Beklenmeyen bir hata oluştu.'];
    }
}
