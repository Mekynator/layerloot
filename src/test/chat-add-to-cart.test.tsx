import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartProvider } from '@/contexts/CartContext';
import { MemoryRouter } from 'react-router-dom';
import { ChatProductCard } from '@/components/ChatWidget';

describe('Chat Add-to-cart integration', () => {
  it('dispatches layerloot:add-to-cart when Add button is clicked', () => {
    const product = {
      id: 'test-123',
      slug: 'test-123',
      name: 'Test Product',
      price: '100 kr',
      priceValue: 100,
      imageUrl: '/test.jpg',
      productUrl: '/products/test-123',
    };

    let eventDetail: any = null;
    const handler = (e: any) => { eventDetail = e.detail; };
    window.addEventListener('layerloot:add-to-cart', handler as EventListener);

    render(
      <MemoryRouter>
        <CartProvider>
          <ChatProductCard product={product as any} />
        </CartProvider>
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeTruthy();

    fireEvent.click(addButton);

    // CartProvider dispatches layerloot:add-to-cart; wait for handler
    expect(eventDetail).not.toBeNull();
    expect(eventDetail.id).toBe(product.id);
    expect(eventDetail.name).toBe(product.name);

    window.removeEventListener('layerloot:add-to-cart', handler as EventListener);
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartProvider } from '@/contexts/CartContext';
import { MemoryRouter } from 'react-router-dom';
import { ChatProductCard } from '@/components/ChatWidget';

describe('Chat Add-to-cart integration', () => {
  it('dispatches layerloot:add-to-cart when Add button is clicked', () => {
    const product = {
      id: 'test-123',
      slug: 'test-123',
      name: 'Test Product',
      price: '100 kr',
      priceValue: 100,
      imageUrl: '/test.jpg',
      productUrl: '/products/test-123',
    };

    let eventDetail: any = null;
    const handler = (e: any) => { eventDetail = e.detail; };
    window.addEventListener('layerloot:add-to-cart', handler as EventListener);

    render(
      <MemoryRouter>
        <CartProvider>
          <ChatProductCard product={product as any} />
        </CartProvider>
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeTruthy();

    fireEvent.click(addButton);

    // CartProvider dispatches layerloot:add-to-cart; wait for handler
    expect(eventDetail).not.toBeNull();
    expect(eventDetail.id).toBe(product.id);
    expect(eventDetail.name).toBe(product.name);

    window.removeEventListener('layerloot:add-to-cart', handler as EventListener);
  });
});
