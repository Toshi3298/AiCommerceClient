import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { finalize } from 'rxjs';
import { AdminDashboardData } from '../../core/models/admin-dashboard.models';
import { ApiResponse } from '../../core/models/api-response';
import { AdminDashboardService } from '../../core/services/admin-dashboard.service';

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

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ButtonModule, ProgressSpinnerModule, TagModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
    readonly dashboard = signal<AdminDashboardData | null>(null);
    readonly isLoading = signal(false);
    readonly errors = signal<string[]>([]);

    private readonly dashboardService = inject(AdminDashboardService);
    private readonly destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.loadDashboard();
    }

    loadDashboard(): void {
        if (this.isLoading()) return;

        this.isLoading.set(true);
        this.errors.set([]);

        this.dashboardService
            .getDashboard()
            .pipe(
                finalize(() => this.isLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.dashboard.set(response.data);
                        return;
                    }

                    this.dashboard.set(null);
                    this.errors.set(this.responseErrors(response));
                },
                error: (error: HttpErrorResponse) => {
                    this.dashboard.set(null);
                    this.errors.set(this.httpErrors(error));
                }
            });
    }

    statusLabel(status: string): string {
        return STATUS_LABELS[status] ?? status;
    }

    statusSeverity(status: string): TagSeverity {
        return STATUS_SEVERITIES[status] ?? 'secondary';
    }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'Dashboard bilgileri yüklenemedi.'];
    }

    private httpErrors(error: HttpErrorResponse): string[] {
        if (error.status === 0) return ['Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.'];

        const response = error.error as Partial<ApiResponse<unknown>> | null;
        return response ? this.responseErrors(response) : ['Dashboard bilgileri yüklenirken beklenmeyen bir hata oluştu.'];
    }
}
