import { Component, HostBinding, Input, OnChanges } from '@angular/core';

@Component({
    selector: 'app-product-image',
    standalone: true,
    templateUrl: './product-image.html',
    styleUrl: './product-image.scss'
})
export class ProductImage implements OnChanges {
    @Input() imageUrl: string | null = null;
    @Input() alt = '';
    @Input() fit: 'contain' | 'cover' = 'contain';

    imageLoaded = false;
    imageFailed = false;

    @HostBinding('class.product-image--contain')
    get containClass(): boolean {
        return this.fit === 'contain';
    }

    @HostBinding('class.product-image--cover')
    get coverClass(): boolean {
        return this.fit === 'cover';
    }

    ngOnChanges(): void {
        this.imageLoaded = false;
        this.imageFailed = false;
    }

    onLoad(): void {
        this.imageLoaded = true;
    }

    onError(): void {
        this.imageFailed = true;
        this.imageLoaded = false;
    }
}
