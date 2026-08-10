import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul>`
})
export class AppMenu implements OnInit {
    model: MenuItem[] = [];

    ngOnInit(): void {
        this.model = [
            {
                label: 'Yönetim',
                items: [
                    { label: 'Genel Bakış', icon: 'pi pi-fw pi-home', routerLink: ['/admin'] },
                    { label: 'Ürünler', icon: 'pi pi-fw pi-box', routerLink: ['/admin/products'] },
                    { label: 'Kategoriler', icon: 'pi pi-fw pi-tags', routerLink: ['/admin/categories'] },
                    { label: 'Siparişler', icon: 'pi pi-fw pi-shopping-bag', routerLink: ['/admin/orders'] }
                ]
            },
            {
                label: 'Mağaza',
                items: [{ label: 'Mağazaya Dön', icon: 'pi pi-fw pi-arrow-left', routerLink: ['/'] }]
            }
        ];
    }
}
