import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CurrentUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-auth-store-layout',
    standalone: true,
    imports: [RouterLink, RouterOutlet],
    templateUrl: './auth-store-layout.html',
    styleUrl: './auth-store-layout.scss'
})
export class AuthStoreLayout implements OnInit {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    readonly menuOpen = signal(false);
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly year = new Date().getFullYear();
    readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    ngOnInit(): void {
        if (!this.currentUrl().startsWith('/cart') || !this.authService.hasToken()) return;

        this.authService.getCurrentUser().subscribe({
            next: (response) => {
                if (response.success && response.data) this.currentUser.set(response.data);
                else this.logout();
            },
            error: (error: HttpErrorResponse) => {
                if (error.status === 401) this.logout();
            }
        });
    }

    logout(): void {
        this.authService.logout();
        this.currentUser.set(null);
        this.menuOpen.set(false);
        void this.router.navigate(['/login']);
    }

    toggleMenu(): void {
        this.menuOpen.update((open) => !open);
    }
}
