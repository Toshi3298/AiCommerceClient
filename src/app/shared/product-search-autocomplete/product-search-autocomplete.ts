import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, of, startWith, switchMap, takeUntil } from 'rxjs';
import { Product } from '../../core/models/product.models';
import { ProductService } from '../../core/services/product.service';

type SearchState =
    | { status: 'idle' | 'loading' | 'error'; products: Product[] }
    | { status: 'success'; products: Product[] };

@Component({
    selector: 'app-product-search-autocomplete',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-search-autocomplete.html',
    styleUrl: './product-search-autocomplete.scss'
})
export class ProductSearchAutocomplete {
    private readonly productService = inject(ProductService);
    private readonly router = inject(Router);
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly searchTerms = new Subject<string>();
    private readonly cancelSearch = new Subject<void>();

    readonly searchText = signal('');
    readonly dropdownOpen = signal(false);
    readonly state = signal<SearchState>({ status: 'idle', products: [] });

    constructor() {
        this.searchTerms
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                filter((search) => search.length >= 2),
                switchMap((search) =>
                    this.productService
                        .searchProducts(search, 1, 5)
                        .pipe(
                            map((response): SearchState => {
                                if (!response.success || !response.data || !Array.isArray(response.data.items)) {
                                    return { status: 'error', products: [] };
                                }
                                return { status: 'success', products: response.data.items.slice(0, 5) };
                            }),
                            catchError(() => of<SearchState>({ status: 'error', products: [] })),
                            startWith<SearchState>({ status: 'loading', products: [] }),
                            takeUntil(this.cancelSearch)
                        )
                )
            )
            .subscribe((state) => this.state.set(state));
    }

    onInput(event: Event): void {
        const search = (event.target as HTMLInputElement).value;
        this.searchText.set(search);
        const normalizedSearch = search.trim();
        this.cancelSearch.next();
        this.searchTerms.next(normalizedSearch);

        if (normalizedSearch.length < 2) {
            this.state.set({ status: 'idle', products: [] });
            this.dropdownOpen.set(false);
            return;
        }

        this.dropdownOpen.set(true);
    }

    onFocus(): void {
        if (this.searchText().trim().length >= 2) this.dropdownOpen.set(true);
    }

    onEscape(): void {
        this.dropdownOpen.set(false);
    }

    showAllResults(): void {
        const search = this.searchText().trim();
        if (!search) return;
        this.dropdownOpen.set(false);
        void this.router.navigate(['/products'], { queryParams: { search } });
    }

    selectProduct(product: Product): void {
        this.dropdownOpen.set(false);
        void this.router.navigate(['/products'], { queryParams: { search: product.name } });
    }

    @HostListener('document:click', ['$event'])
    closeOnOutsideClick(event: Event): void {
        if (!this.elementRef.nativeElement.contains(event.target as Node)) this.dropdownOpen.set(false);
    }
}
