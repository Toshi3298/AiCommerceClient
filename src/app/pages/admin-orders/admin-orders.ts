import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { AdminOrderDetail, AdminOrderStatus, AdminOrderSummary, AdminOrdersFilter } from '../../core/models/admin-order.models';
import { ApiResponse } from '../../core/models/api-response';
import { AdminOrderService } from '../../core/services/admin-order.service';
import { ProductImage } from '../../shared/product-image/product-image';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const STATUS_LABELS: Record<string, string> = {
    Pending: 'Bekliyor',
    Preparing: 'Hazırlanıyor',
    Shipped: 'Kargoya Verildi',
    Delivered: 'Teslim Edildi',
    Cancelled: 'İptal Edildi'
};
const STATUS_SEVERITIES: Record<string, TagSeverity> = {
    Pending: 'warn',
    Preparing: 'info',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'danger'
};
const NEXT_STATUSES: Partial<Record<AdminOrderStatus, AdminOrderStatus[]>> = {
    Pending: ['Preparing', 'Cancelled'],
    Preparing: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered'],
    Delivered: [],
    Cancelled: []
};

@Component({
    selector: 'app-admin-orders',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, PaginatorModule, ProgressSpinnerModule, SelectModule, TableModule, TagModule, ToastModule, ProductImage],
    providers: [MessageService, ConfirmationService],
    templateUrl: './admin-orders.html',
    styleUrl: './admin-orders.scss'
})
export class AdminOrders implements OnInit {
    readonly orders = signal<AdminOrderSummary[]>([]);
    readonly totalCount = signal(0);
    readonly pageNumber = signal(1);
    readonly pageSize = signal(10);
    readonly isListLoading = signal(false);
    readonly listErrors = signal<string[]>([]);
    readonly detailVisible = signal(false);
    readonly detailOrderId = signal<number | null>(null);
    readonly detail = signal<AdminOrderDetail | null>(null);
    readonly isDetailLoading = signal(false);
    readonly detailErrors = signal<string[]>([]);
    readonly updatingIds = signal<Set<number>>(new Set());
    readonly selectedStatuses = signal<Record<number, AdminOrderStatus | undefined>>({});

    readonly statusFilterOptions = [
        { label: 'Tümü', value: null },
        { label: 'Bekliyor', value: 'Pending' },
        { label: 'Hazırlanıyor', value: 'Preparing' },
        { label: 'Kargoya Verildi', value: 'Shipped' },
        { label: 'Teslim Edildi', value: 'Delivered' },
        { label: 'İptal Edildi', value: 'Cancelled' }
    ];
    readonly pageSizeOptions = [10, 20, 50];

    private readonly fb = inject(FormBuilder);
    private readonly orderService = inject(AdminOrderService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly destroyRef = inject(DestroyRef);

    readonly filterForm = this.fb.group({
        search: [''],
        status: [null as AdminOrderStatus | null],
        pageSize: [10]
    });

    ngOnInit(): void {
        this.loadOrders();
    }

    applyFilters(): void {
        this.pageNumber.set(1);
        this.pageSize.set(this.filterForm.controls.pageSize.value ?? 10);
        this.loadOrders();
    }

    clearFilters(): void {
        this.filterForm.reset({ search: '', status: null, pageSize: 10 });
        this.applyFilters();
    }

    onPageChange(event: PaginatorState): void {
        const nextSize = event.rows ?? this.pageSize();
        this.pageSize.set(nextSize);
        this.pageNumber.set((event.page ?? 0) + 1);
        this.filterForm.controls.pageSize.setValue(nextSize);
        this.loadOrders();
    }

    openDetail(orderId: number): void {
        if (this.isDetailLoading()) return;
        this.detailVisible.set(true);
        this.detailOrderId.set(orderId);
        this.loadOrderDetail(orderId, true);
    }

    retryDetail(): void {
        const orderId = this.detailOrderId();
        if (orderId !== null) this.loadOrderDetail(orderId, true);
    }

    selectStatus(orderId: number, status: AdminOrderStatus): void {
        this.selectedStatuses.update((selected) => ({ ...selected, [orderId]: status }));
    }

    selectedStatus(orderId: number): AdminOrderStatus | undefined {
        return this.selectedStatuses()[orderId];
    }
    isUpdating(orderId: number): boolean {
        return this.updatingIds().has(orderId);
    }

    statusOptions(status: string): { label: string; value: AdminOrderStatus }[] {
        const next = NEXT_STATUSES[status as AdminOrderStatus] ?? [];
        return next.map((value) => ({ label: this.statusLabel(value), value }));
    }

    canUpdateStatus(status: string): boolean {
        return this.statusOptions(status).length > 0;
    }
    statusLabel(status: string): string {
        return STATUS_LABELS[status] ?? status;
    }
    statusSeverity(status: string): TagSeverity {
        return STATUS_SEVERITIES[status] ?? 'secondary';
    }
    statusInfo(status: string): string {
        return status === 'Delivered' || status === 'Cancelled' ? 'Bu siparişin durumu artık değiştirilemez.' : 'Bu durum için geçerli bir sonraki adım bulunmuyor.';
    }

    confirmStatusUpdate(orderId: number, currentStatus: string): void {
        const nextStatus = this.selectedStatus(orderId);
        if (!nextStatus || this.isUpdating(orderId) || !this.statusOptions(currentStatus).some((option) => option.value === nextStatus)) return;
        this.confirmationService.confirm({
            header: 'Sipariş Durumunu Güncelle',
            icon: 'pi pi-exclamation-triangle',
            message: `#${orderId} numaralı siparişi “${this.statusLabel(nextStatus)}” durumuna geçirmek istediğinize emin misiniz?`,
            acceptLabel: 'Güncelle',
            rejectLabel: 'Vazgeç',
            accept: () => this.updateStatus(orderId, nextStatus)
        });
    }

    loadOrders(): void {
        if (this.isListLoading()) return;
        this.isListLoading.set(true);
        this.listErrors.set([]);
        this.orderService
            .getOrders(this.buildFilter())
            .pipe(
                finalize(() => this.isListLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success || !response.data) {
                        this.listErrors.set(this.responseErrors(response));
                        return;
                    }
                    this.orders.set(response.data.items);
                    this.totalCount.set(response.data.totalCount);
                    this.pageNumber.set(response.data.pageNumber);
                    this.pageSize.set(response.data.pageSize);
                },
                error: (error: HttpErrorResponse) => this.listErrors.set(this.httpErrors(error))
            });
    }

    private loadOrderDetail(orderId: number, clearCurrent: boolean): void {
        if (this.isDetailLoading()) return;
        if (clearCurrent) this.detail.set(null);
        this.isDetailLoading.set(true);
        this.detailErrors.set([]);
        this.orderService
            .getOrderById(orderId)
            .pipe(
                finalize(() => this.isDetailLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => (response.success && response.data ? this.detail.set(response.data) : this.detailErrors.set(this.responseErrors(response))),
                error: (error: HttpErrorResponse) => this.detailErrors.set(this.httpErrors(error, true))
            });
    }

    private updateStatus(orderId: number, status: AdminOrderStatus): void {
        if (this.isUpdating(orderId)) return;
        this.updatingIds.update((ids) => new Set(ids).add(orderId));
        this.listErrors.set([]);
        this.orderService
            .updateOrderStatus(orderId, { status })
            .pipe(
                finalize(() =>
                    this.updatingIds.update((ids) => {
                        const next = new Set(ids);
                        next.delete(orderId);
                        return next;
                    })
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (!response.success) {
                        this.setUpdateErrors(orderId, this.responseErrors(response));
                        return;
                    }
                    this.selectedStatuses.update((selected) => ({ ...selected, [orderId]: undefined }));
                    this.messageService.add({ severity: 'success', summary: 'Başarılı', detail: 'Sipariş durumu güncellendi' });
                    this.loadOrders();
                    if (this.detailVisible() && this.detailOrderId() === orderId) this.loadOrderDetail(orderId, false);
                },
                error: (error: HttpErrorResponse) => this.setUpdateErrors(orderId, this.httpErrors(error))
            });
    }

    private buildFilter(): AdminOrdersFilter {
        const value = this.filterForm.getRawValue();
        return { search: value.search?.trim() || undefined, status: value.status ?? undefined, pageNumber: this.pageNumber(), pageSize: this.pageSize() };
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı.'];
    }

    private setUpdateErrors(orderId: number, errors: string[]): void {
        if (this.detailVisible() && this.detailOrderId() === orderId) this.detailErrors.set(errors);
        else this.listErrors.set(errors);
    }
    private httpErrors(error: HttpErrorResponse, detail = false): string[] {
        if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];
        if (error.status === 401) return ['Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.'];
        if (error.status === 403) return ['Bu işlem için yönetici yetkiniz bulunmuyor.'];
        if (detail && error.status === 404) return ['Sipariş bulunamadı.'];
        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['Beklenmeyen bir hata oluştu.'];
    }
}
