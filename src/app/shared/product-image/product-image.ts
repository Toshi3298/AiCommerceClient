import { Component, Input, OnChanges } from '@angular/core';

@Component({
    selector: 'app-product-image',
    standalone: true,
    templateUrl: './product-image.html',
    styleUrl: './product-image.scss'
})
export class ProductImage implements OnChanges {
    @Input() imageUrl: string | null = null;
    @Input() alt = '';

    imageLoaded = false;
    imageFailed = false;

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
