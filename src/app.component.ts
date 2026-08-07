import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AiShoppingAssistant } from './app/shared/ai-shopping-assistant/ai-shopping-assistant';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, AiShoppingAssistant],
    template: `<router-outlet></router-outlet>@if (showAssistant()) { <app-ai-shopping-assistant /> }`
})
export class AppComponent {
    private readonly router = inject(Router);
    private readonly currentUrl = signal(this.router.url);
    readonly showAssistant = computed(() => {
        const path = this.currentUrl().split('?')[0].split('#')[0];
        return path === '/' || ['/products', '/cart', '/checkout', '/orders', '/login', '/register', '/ai-search', '/about', '/contact'].some((customerPath) => path === customerPath || path.startsWith(`${customerPath}/`));
    });

    constructor() {
        this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
    }
}
