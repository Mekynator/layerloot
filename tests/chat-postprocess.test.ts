import { describe, it, expect } from 'vitest';
import { parseChatProducts, sanitizeContent, stripProductBlocks } from '@/lib/chatPostprocess';

describe('chat postprocess helpers', () => {
  it('parses product blocks correctly', () => {
    const assistant = `Here are suggestions:\n• **Real Widget**\n  - A great pick\n  - 199 kr\n  - ![Real Widget](/r1.jpg)\n  - → [View product](/products/real-widget)\n\n• **Imaginary Dragon**\n  - Legendary toy\n  - 500 kr\n  - ![Imaginary Dragon](/x.jpg)\n  - → [View product](/products/imaginary-dragon)\n`;

    const products = parseChatProducts(assistant);
    expect(products.length).toBe(2);
    expect(products[0].name).toBe('Real Widget');
    expect(products[0].imageUrl).toBe('/r1.jpg');
    expect(products[0].productUrl).toBe('/products/real-widget');
    expect(products[1].name).toBe('Imaginary Dragon');
  });

  it('sanitizes internal routes and returns found routes', () => {
    const text = 'Check these: /products?category=paint-by-numbers and also /create or [link](/products/slug)';
    const { sanitized, routes } = sanitizeContent(text);
    expect(sanitized).not.toContain('/products');
    expect(sanitized).not.toContain('/create');
    expect(routes).toContain('/products?category=paint-by-numbers');
    expect(routes).toContain('/create');
    expect(routes).toContain('/products/slug');
  });

  it('stripProductBlocks removes product blocks', () => {
    const assistant = `Intro\n• **One**\n  - desc\n  - 100 kr\n\nMore text`;
    const stripped = stripProductBlocks(assistant);
    expect(stripped).toContain('Intro');
    expect(stripped).toContain('More text');
    expect(stripped).not.toContain('One');
  });
});
