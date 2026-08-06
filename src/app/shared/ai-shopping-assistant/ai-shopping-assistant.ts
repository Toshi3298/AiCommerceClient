import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, DestroyRef, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { ApiResponse } from '../../core/models/api-response';
import { Product } from '../../core/models/product.models';
import { AiSearchService } from '../../core/services/ai-search.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ProductImage } from '../product-image/product-image';

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    products?: Product[];
    loading?: boolean;
}

const WELCOME_MESSAGE = 'Merhaba, ben Bia. Aradığın ürünü doğal dille tarif et, sana uygun seçenekleri bulayım.';

@Component({
    selector: 'app-ai-shopping-assistant',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, ProductImage],
    templateUrl: './ai-shopping-assistant.html',
    styleUrl: './ai-shopping-assistant.scss'
})
export class AiShoppingAssistant implements AfterViewChecked {
    private readonly formBuilder = inject(FormBuilder);
    private readonly aiSearchService = inject(AiSearchService);
    private readonly cartService = inject(CartService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private messageId = 1;
    private shouldScroll = false;

    @ViewChild('messageArea') private messageArea?: ElementRef<HTMLElement>;
    @ViewChild('promptInput') private promptInput?: ElementRef<HTMLTextAreaElement>;
    @ViewChild('launcherButton') private launcherButton?: ElementRef<HTMLButtonElement>;

    readonly isOpen = signal(false);
    readonly isLoading = signal(false);
    readonly messages = signal<ChatMessage[]>([this.createMessage('assistant', WELCOME_MESSAGE)]);
    readonly addingProductIds = signal<ReadonlySet<number>>(new Set<number>());
    readonly examples = [
        '20.000 TL altındaki telefonları getir',
        'Stokta bulunan kitapları göster',
        'En ucuz Samsung telefonları bul',
        'Spor ürünlerini fiyatına göre sırala'
    ];
    readonly form = this.formBuilder.group({
        prompt: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(500)])
    });

    get promptControl() { return this.form.controls.prompt; }

    ngAfterViewChecked(): void {
        if (!this.shouldScroll || !this.messageArea) return;
        this.messageArea.nativeElement.scrollTop = this.messageArea.nativeElement.scrollHeight;
        this.shouldScroll = false;
    }

    toggle(): void {
        this.isOpen.update((open) => !open);
        if (this.isOpen()) setTimeout(() => this.promptInput?.nativeElement.focus());
    }

    close(): void {
        this.isOpen.set(false);
        setTimeout(() => this.launcherButton?.nativeElement.focus());
    }

    clearConversation(): void {
        if (this.isLoading()) return;
        this.messages.set([this.createMessage('assistant', WELCOME_MESSAGE)]);
        this.form.reset({ prompt: '' });
        this.requestScroll();
        setTimeout(() => this.promptInput?.nativeElement.focus());
    }

    selectExample(example: string): void {
        this.promptControl.setValue(example);
        this.promptControl.markAsUntouched();
        setTimeout(() => this.promptInput?.nativeElement.focus());
    }

    handleKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        this.sendMessage();
    }

    sendMessage(): void {
        if (this.isLoading()) return;
        const prompt = this.promptControl.value.trim();
        this.promptControl.setValue(prompt);
        this.promptControl.markAsTouched();
        this.promptControl.updateValueAndValidity();
        if (this.form.invalid) return;

        this.appendMessage(this.createMessage('user', prompt));
        const loadingMessage = this.createMessage('assistant', 'Bia ürünleri araştırıyor…', undefined, true);
        this.appendMessage(loadingMessage);
        this.form.reset({ prompt: '' });
        this.isLoading.set(true);

        this.aiSearchService.searchProducts({ prompt })
            .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.removeMessage(loadingMessage.id);
                    if (!response.success || !response.data || !Array.isArray(response.data.products)) {
                        this.appendMessage(this.createMessage('assistant', this.responseErrors(response).join(' ')));
                        return;
                    }
                    if (!response.data.products.length) {
                        this.appendMessage(this.createMessage('assistant', 'Bu isteğe uygun bir ürün bulamadım. Aramanı farklı kelimelerle tekrar deneyebilirsin.'));
                        return;
                    }
                    this.appendMessage(this.createMessage('assistant', 'İsteğine uygun ürünleri buldum.', response.data.products));
                },
                error: (error: HttpErrorResponse) => {
                    this.removeMessage(loadingMessage.id);
                    const message = error.status === 400
                        ? this.responseErrors((error.error ?? {}) as Partial<ApiResponse<unknown>>).join(' ')
                        : 'Bia şu anda yanıt veremiyor. Backend ve Ollama servislerinin çalıştığını kontrol edip tekrar deneyin.';
                    this.appendMessage(this.createMessage('assistant', message));
                }
            });
    }

    addToCart(product: Product): void {
        if (this.isAdding(product.id) || product.stock <= 0 || !product.isActive) return;
        if (!this.authService.hasToken()) {
            const currentUrl = this.router.url;
            const returnUrl = currentUrl.startsWith('/') && !currentUrl.startsWith('//') ? currentUrl : '/';
            this.close();
            void this.router.navigate(['/login'], { queryParams: { returnUrl } });
            return;
        }

        this.setAdding(product.id, true);
        this.cartService.addItem({ productId: product.id, quantity: 1 })
            .pipe(finalize(() => this.setAdding(product.id, false)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => this.appendMessage(this.createMessage('assistant', response.success ? response.message || 'Ürün sepete eklendi.' : this.responseErrors(response).join(' '))),
                error: (error: HttpErrorResponse) => {
                    const response = error.error as Partial<ApiResponse<unknown>> | null;
                    const message = error.status === 0 ? 'Sepet servisine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.' : response ? this.responseErrors(response).join(' ') : 'Sepet işlemi tamamlanamadı. Lütfen tekrar deneyin.';
                    this.appendMessage(this.createMessage('assistant', message));
                }
            });
    }

    isAdding(productId: number): boolean { return this.addingProductIds().has(productId); }

    @HostListener('document:keydown.escape')
    closeWithEscape(): void { if (this.isOpen()) this.close(); }

    private createMessage(role: ChatMessage['role'], text: string, products?: Product[], loading = false): ChatMessage {
        return { id: this.messageId++, role, text, products, loading };
    }

    private appendMessage(message: ChatMessage): void {
        this.messages.update((messages) => [...messages, message]);
        this.requestScroll();
    }

    private removeMessage(id: number): void {
        this.messages.update((messages) => messages.filter((message) => message.id !== id));
    }

    private requestScroll(): void { this.shouldScroll = true; }

    private responseErrors(response: Partial<ApiResponse<unknown>>): string[] {
        return response.errors?.length ? response.errors : [response.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'];
    }

    private setAdding(productId: number, adding: boolean): void {
        const ids = new Set(this.addingProductIds());
        adding ? ids.add(productId) : ids.delete(productId);
        this.addingProductIds.set(ids);
    }
}
