import { describe, it, expect } from 'vitest';
import { sanitizeAssistantText } from '@/lib/chatSanitizer';

describe('chat sanitizer', () => {
  it('removes unmatched fictional product blocks and keeps matched ones', () => {
    const products = [
      { id: 'p1', name: 'Real Widget', slug: 'real-widget', price: 199, images: ['/r1.jpg'] },
    ];

    const assistant = `Here are suggestions:\n• **Real Widget**\n  - A great pick\n  - 199 kr\n  - ![Real Widget](/r1.jpg)\n  - → [View product](/products/real-widget)\n\n• **Imaginary Dragon**\n  - Legendary toy\n  - 500 kr\n  - ![Imaginary Dragon](/x.jpg)\n  - → [View product](/products/imaginary-dragon)\n`;

    const out = sanitizeAssistantText(assistant, products as any);
    expect(out).toContain('Real Widget');
    expect(out).not.toContain('Imaginary Dragon');
    expect(out).toContain('/products/real-widget');
  });

  it('adds fallback when no real products found for a product intent', () => {
    const products: any[] = [];
    const assistant = 'Can you recommend products?';
    const out = sanitizeAssistantText(assistant, products);
    expect(out).toContain('couldn\'t find exact active products');
    expect(out).toContain('/products');
  });
});
