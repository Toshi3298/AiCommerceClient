import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { OrderSummary } from '../../core/models/order.models';
import { OrderService } from '../../core/services/order.service';

const STATUS_LABELS: Record<string, string> = { Pending: 'Bekliyor', Preparing: 'Hazırlanıyor', Shipped: 'Kargoya Verildi', Delivered: 'Teslim Edildi', Cancelled: 'İptal Edildi' };

@Component({ selector: 'app-orders', standalone: true, imports: [CommonModule, RouterLink, ButtonModule, ProgressSpinnerModule], templateUrl: './orders.html', styleUrl: './orders.scss' })
export class Orders implements OnInit {
    readonly orders = signal<OrderSummary[]>([]); readonly isLoading = signal(true); readonly apiErrors = signal<string[]>([]);
    constructor(private readonly orderService: OrderService) {}
    ngOnInit(): void { this.orderService.getOrders().pipe(finalize(() => this.isLoading.set(false))).subscribe({ next: (response) => response.success && Array.isArray(response.data) ? this.orders.set(response.data) : this.apiErrors.set(this.errors(response)), error: (error: HttpErrorResponse) => this.apiErrors.set(this.httpErrors(error)) }); }
    statusLabel(status: string): string { return STATUS_LABELS[status] ?? status; }
    statusClass(status: string): string { return ['Pending','Preparing','Shipped','Delivered','Cancelled'].includes(status) ? status.toLowerCase() : 'unknown'; }
    private errors(response: Partial<ApiResponse<unknown>>): string[] { return response.errors?.length ? response.errors : [response.message || 'Siparişler yüklenemedi.']; }
    private httpErrors(error: HttpErrorResponse): string[] { if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.']; const response = error.error as Partial<ApiResponse<unknown>> | null; return response ? this.errors(response) : ['Siparişler yüklenirken bir hata oluştu.']; }
}
