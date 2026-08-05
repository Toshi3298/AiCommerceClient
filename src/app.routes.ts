import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { StoreHome } from './app/pages/store-home/store-home';
import { AuthStoreLayout } from './app/pages/store-auth/auth-store-layout';
import { StoreLogin } from './app/pages/store-auth/login/login';
import { StoreRegister } from './app/pages/store-auth/register/register';
import { Cart } from './app/pages/cart/cart';
import { authGuard } from './app/core/guards/auth.guard';
import { Products } from './app/pages/products/products';
import { Checkout } from './app/pages/checkout/checkout';
import { Orders } from './app/pages/orders/orders';
import { OrderDetail } from './app/pages/order-detail/order-detail';
import { ProductDetail } from './app/pages/product-detail/product-detail';

export const appRoutes: Routes = [
    { path: '', component: StoreHome },
    {
        path: '',
        component: AuthStoreLayout,
        children: [
            { path: 'login', component: StoreLogin },
            { path: 'register', component: StoreRegister },
            { path: 'products', component: Products },
            { path: 'products/:id', component: ProductDetail },
            { path: 'cart', component: Cart, canActivate: [authGuard] },
            { path: 'checkout', component: Checkout, canActivate: [authGuard] },
            { path: 'orders', component: Orders, canActivate: [authGuard] },
            { path: 'orders/:orderId', component: OrderDetail, canActivate: [authGuard] }
        ]
    },
    {
        path: 'admin',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
