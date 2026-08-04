import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { OrderDetail as OrderDetailModel } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';

const STATUS_LABELS: Record<string, string> = { Pending: 'Bekliyor', Preparing: 'Hazırlanıyor', Shipped: 'Kargoya Verildi', Delivered: 'Teslim Edildi', Cancelled: 'İptal Edildi' };

@Component({ selector: 'app-order-detail', standalone: true, imports: [CommonModule, RouterLink, ButtonModule, ProgressSpinnerModule], templateUrl: './order-detail.html', styleUrl: './order-detail.scss' })
export class OrderDetail implements OnInit {
    readonly order = signal<OrderDetailModel | null>(null); readonly isLoading = signal(false); readonly apiErrors = signal<string[]>([]); readonly invalidId = signal(false); readonly notFound = signal(false); readonly orderCreated = history.state?.orderCreated === true;
    constructor(private readonly route: ActivatedRoute, private readonly orderService: OrderService) {}
    ngOnInit(): void { const raw = this.route.snapshot.paramMap.get('orderId'); const id = raw && /^\d+$/.test(raw) ? Number(raw) : 0; if (!Number.isSafeInteger(id) || id <= 0) { this.invalidId.set(true); return; } this.load(id); }
    statusLabel(status: string): string { return STATUS_LABELS[status] ?? status; }
    statusClass(status: string): string { return ['Pending','Preparing','Shipped','Delivered','Cancelled'].includes(status) ? status.toLowerCase() : 'unknown'; }
    private load(id: number): void { this.isLoading.set(true); this.orderService.getOrderById(id).pipe(finalize(() => this.isLoading.set(false))).subscribe({ next: (response) => { if (response.success && response.data) this.order.set(response.data); else this.apiErrors.set(this.errors(response)); }, error: (error: HttpErrorResponse) => { if (error.status === 404) this.notFound.set(true); this.apiErrors.set(this.httpErrors(error)); } }); }
    private errors(response: Partial<ApiResponse<unknown>>): string[] { return response.errors?.length ? response.errors : [response.message || 'Sipariş bilgisi yüklenemedi.']; }
    private httpErrors(error: HttpErrorResponse): string[] { if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.']; const response = error.error as Partial<ApiResponse<unknown>> | null; return response ? this.errors(response) : [error.status === 404 ? 'Sipariş bulunamadı.' : 'Sipariş yüklenirken bir hata oluştu.']; }
}
