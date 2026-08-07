import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    templateUrl: './about.html',
    styleUrl: './about.scss'
})
export class About {
    readonly features = [
        { icon: 'pi-shield', title: 'Güvenli üyelik ve JWT oturumu', description: 'Kimlik doğrulama akışlarıyla korunan hesap, sepet ve sipariş deneyimi.' },
        { icon: 'pi-search', title: 'Ürün arama ve filtreleme', description: 'Kategori, marka, fiyat ve stok seçenekleriyle düzenli ürün keşfi.' },
        { icon: 'pi-shopping-cart', title: 'Sepet ve sipariş yönetimi', description: 'Ürün eklemeden sipariş detayına uzanan anlaşılır alışveriş akışı.' },
        { icon: 'pi-sparkles', title: 'Bia yapay zekâ alışveriş asistanı', description: 'Doğal dildeki ihtiyaçları ürün seçenekleriyle buluşturan yardımcı deneyim.' }
    ];

    readonly technologies = ['Angular', 'PrimeNG', 'ASP.NET Core', 'Entity Framework Core', 'SQL Server', 'MediatR/CQRS', 'Ollama'];
}
