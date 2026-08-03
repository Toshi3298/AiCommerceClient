import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

interface Product { name: string; price: number; oldPrice?: number; image: string; badge?: string; reviews: number; }

@Component({ selector: 'app-store-home', standalone: true, imports: [CommonModule, RouterLink, ButtonModule], templateUrl: './store-home.html', styleUrl: './store-home.scss' })
export class StoreHome {
    readonly menuOpen = signal(false);
    readonly year = new Date().getFullYear();
    readonly categories = [
        { name: 'Telefonlar', icon: 'pi-mobile' }, { name: 'Bilgisayarlar', icon: 'pi-desktop' },
        { name: 'Akıllı Saat', icon: 'pi-clock' }, { name: 'Kamera', icon: 'pi-camera' },
        { name: 'Kulaklıklar', icon: 'pi-headphones' }, { name: 'Oyun', icon: 'pi-microchip' }
    ];
    readonly flashProducts: Product[] = [
        { name: 'Kablosuz Oyun Kumandası', price: 120, oldPrice: 160, image: '/demo/images/product/game-controller.jpg', badge: '-40%', reviews: 88 },
        { name: 'RGB Oyuncu Seti', price: 96, oldPrice: 116, image: '/demo/images/product/gaming-set.jpg', badge: '-35%', reviews: 75 },
        { name: 'Kablosuz Kulaklık', price: 78, oldPrice: 99, image: '/demo/images/product/headphones.jpg', badge: '-30%', reviews: 99 },
        { name: 'Akıllı Spor Saati', price: 64, oldPrice: 80, image: '/demo/images/product/black-watch.jpg', badge: '-20%', reviews: 63 }
    ];
    readonly bestSellers: Product[] = [
        { name: 'Klasik Mavi Tişört', price: 260, image: '/demo/images/product/blue-t-shirt.jpg', reviews: 65 },
        { name: 'Şehir Omuz Çantası', price: 390, oldPrice: 430, image: '/demo/images/product/brown-purse.jpg', reviews: 82 },
        { name: 'Yeşil Kulak İçi Kulaklık', price: 160, image: '/demo/images/product/green-earbuds.jpg', reviews: 58 },
        { name: 'Minimal Akıllı Saat', price: 350, image: '/demo/images/product/bamboo-watch.jpg', reviews: 46 }
    ];
    readonly exploreProducts: Product[] = [
        { name: 'Günlük Sneaker', price: 100, image: '/demo/images/product/sneakers.jpg', reviews: 35 },
        { name: 'Mor Akıllı Bileklik', price: 78, image: '/demo/images/product/purple-band.jpg', reviews: 95 },
        { name: 'Yoga Başlangıç Seti', price: 210, image: '/demo/images/product/yoga-set.jpg', reviews: 145 },
        { name: 'Mini Bluetooth Hoparlör', price: 59, image: '/demo/images/product/mini-speakers.jpg', reviews: 67 },
        { name: 'Sarı Kablosuz Kulaklık', price: 89, image: '/demo/images/product/yellow-earbuds.jpg', badge: 'YENİ', reviews: 71 },
        { name: 'Fitness Yoga Matı', price: 54, image: '/demo/images/product/yoga-mat.jpg', badge: 'YENİ', reviews: 42 },
        { name: 'Premium Bileklik', price: 49, image: '/demo/images/product/chakra-bracelet.jpg', reviews: 88 },
        { name: 'Yeşil Basic Tişört', price: 72, image: '/demo/images/product/green-t-shirt.jpg', reviews: 51 }
    ];
    toggleMenu(): void { this.menuOpen.update((open) => !open); }
}
