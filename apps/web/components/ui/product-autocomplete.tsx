'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  servingSize: string | null;
  carbsG: string | null;
  sodiumMg: string | null;
  caffeineMg: string | null;
  kcal: number | null;
}

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onProductSelect: (product: CatalogProduct) => void;
  placeholder?: string;
  className?: string;
}

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const categoryLabels: Record<string, string> = {
  gel: 'Gel',
  isotonic: 'Bebida',
  bar: 'Barra',
  salt_capsule: 'Sal',
  caffeine: 'Cafeína',
  other: 'Outro',
};

export function ProductAutocomplete({
  value,
  onChange,
  onProductSelect,
  placeholder = 'Ex: Gel SiS Isotonic',
  className,
}: ProductAutocompleteProps) {
  const { token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(value, 300);

  const { data, isFetching } = useQuery<{ data: CatalogProduct[] }>({
    queryKey: ['product-catalog', debouncedQuery],
    queryFn: () =>
      apiFetch<{ data: CatalogProduct[] }>(
        `/api/nutrition/catalog/search?q=${encodeURIComponent(debouncedQuery)}`,
        { token: token ?? undefined },
      ),
    enabled: !!token && debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.data ?? [];

  useEffect(() => {
    if (products.length > 0 && debouncedQuery.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [products, debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectProduct(products[selectedIndex]!);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function selectProduct(product: CatalogProduct) {
    onChange(`${product.name} (${product.brand})`);
    onProductSelect(product);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (products.length > 0 && value.length >= 2) setIsOpen(true);
          }}
          className={cn(
            'w-full h-14 px-5 pr-12 bg-bg-surface border-2 border-border-strong/50 rounded-full',
            'text-white placeholder:text-text-muted text-[15px] outline-none transition-colors',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            className,
          )}
        />
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xl">
          {isFetching ? 'hourglass_empty' : 'search'}
        </span>
      </div>

      {isOpen && products.length > 0 && (
        <div className="absolute z-[60] w-full mt-2 bg-bg-surface border border-border-strong/50 rounded-2xl shadow-card overflow-hidden max-h-[240px] overflow-y-auto">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => selectProduct(product)}
              className={cn(
                'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                index === selectedIndex ? 'bg-primary/20' : 'hover:bg-bg-elevated/50',
                index > 0 && 'border-t border-border-strong/30',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-white font-medium truncate">
                  {product.name}
                </p>
                <p className="text-[12px] text-text-secondary truncate">
                  {product.brand}
                  {product.servingSize && ` · ${product.servingSize}`}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                {categoryLabels[product.category] ?? product.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
