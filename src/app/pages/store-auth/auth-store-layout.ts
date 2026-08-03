import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
    selector: 'app-auth-store-layout',
    standalone: true,
    imports: [RouterLink, RouterOutlet],
    templateUrl: './auth-store-layout.html',
    styleUrl: './auth-store-layout.scss'
})
export class AuthStoreLayout {
    private readonly router = inject(Router);
    readonly menuOpen = signal(false);
    readonly year = new Date().getFullYear();
    readonly currentUrl = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );
    toggleMenu(): void {
        this.menuOpen.update((open) => !open);
    }
}
