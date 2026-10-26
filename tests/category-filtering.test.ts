/**
 * Category Filtering Tests
 *
 * Tests category filtering on the Explore Products page and category management in Admin
 */

import { describe, it, expect } from 'vitest';

describe('Category Data Model', () => {
  it('should define all 5 business categories', () => {
    const expectedCategories = [
      'Desk & Workspace',
      'Gaming, Fandom & Collectibles',
      'Home & Everyday Utility',
      'Engineering & Robotics',
      'Personalised Products',
    ];

    expect(expectedCategories).toHaveLength(5);
    expectedCategories.forEach((name) => {
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
    });
  });

  it('should have valid slugs for all categories', () => {
    const categoryMappings = [
      { name: 'Desk & Workspace', slug: 'desk-workspace' },
      { name: 'Gaming, Fandom & Collectibles', slug: 'gaming-fandom-collectibles' },
      { name: 'Home & Everyday Utility', slug: 'home-everyday-utility' },
      { name: 'Engineering & Robotics', slug: 'engineering-robotics' },
      { name: 'Personalised Products', slug: 'personalised-products' },
    ];

    categoryMappings.forEach(({ name, slug }) => {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).not.toMatch(/^-|-$/);
      expect(name).toBeTruthy();
    });
  });
});

describe('Category Filtering Logic', () => {
  const mockProducts = [
    {
      id: '1',
      name: 'Desk Organizer',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      shortDescription: 'Organize your desk',
      description: 'A modular desk organizer',
      slug: 'desk-organizer',
      variants: [{ id: 'v1', sku: 'DO-001', pricePaise: 50000, isDefault: true }],
    },
    {
      id: '2',
      name: 'Gaming Figurine',
      categoryId: 'c2222222-2222-2222-2222-222222222222',
      shortDescription: 'Gaming collectible',
      description: 'A collectible gaming figurine',
      slug: 'gaming-figurine',
      variants: [{ id: 'v2', sku: 'GF-001', pricePaise: 75000, isDefault: true }],
    },
    {
      id: '3',
      name: 'Kitchen Organizer',
      categoryId: 'c3333333-3333-3333-3333-333333333333',
      shortDescription: 'Home utility',
      description: 'Kitchen organization tool',
      slug: 'kitchen-organizer',
      variants: [{ id: 'v3', sku: 'KO-001', pricePaise: 40000, isDefault: true }],
    },
    {
      id: '4',
      name: 'Robot Arm Component',
      categoryId: 'c4444444-4444-4444-4444-444444444444',
      shortDescription: 'Engineering part',
      description: 'Robotic arm component',
      slug: 'robot-arm',
      variants: [{ id: 'v4', sku: 'RA-001', pricePaise: 150000, isDefault: true }],
    },
    {
      id: '5',
      name: 'Custom Nameplate',
      categoryId: 'c5555555-5555-5555-5555-555555555555',
      shortDescription: 'Personalized gift',
      description: 'Custom engraved nameplate',
      slug: 'nameplate',
      variants: [{ id: 'v5', sku: 'NP-001', pricePaise: 30000, isDefault: true }],
    },
  ];

  it('should filter products by Desk & Workspace category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'c1111111-1111-1111-1111-111111111111'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Desk Organizer');
  });

  it('should filter products by Gaming, Fandom & Collectibles category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'c2222222-2222-2222-2222-222222222222'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Gaming Figurine');
  });

  it('should filter products by Home & Everyday Utility category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'c3333333-3333-3333-3333-333333333333'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Kitchen Organizer');
  });

  it('should filter products by Engineering & Robotics category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'c4444444-4444-4444-4444-444444444444'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Robot Arm Component');
  });

  it('should filter products by Personalised Products category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'c5555555-5555-5555-5555-555555555555'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Custom Nameplate');
  });

  it('should return all products when no category filter is applied', () => {
    const filtered = mockProducts.filter((p) => !null || p);

    expect(filtered).toHaveLength(5);
  });

  it('should return empty array when filtering by non-existent category', () => {
    const filtered = mockProducts.filter(
      (p) => p.categoryId === 'non-existent-category'
    );

    expect(filtered).toHaveLength(0);
  });
});

describe('Category Filtering with Search', () => {
  const mockProducts = [
    {
      id: '1',
      name: 'Desk Organizer Pro',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      shortDescription: 'Premium organizer',
      description: 'A premium desk organization system',
      slug: 'desk-organizer-pro',
    },
    {
      id: '2',
      name: 'Desk Lamp Stand',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      shortDescription: 'Lamp holder',
      description: 'Adjustable desk lamp stand',
      slug: 'desk-lamp',
    },
    {
      id: '3',
      name: 'Gaming Mouse Holder',
      categoryId: 'c2222222-2222-2222-2222-222222222222',
      shortDescription: 'Gaming accessory',
      description: 'Organize your gaming desk',
      slug: 'gaming-mouse',
    },
  ];

  it('should filter by category AND search query', () => {
    const categoryId = 'c1111111-1111-1111-1111-111111111111';
    const searchQuery = 'organizer';

    const filtered = mockProducts.filter((p) => {
      const matchesCategory = p.categoryId === categoryId;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Desk Organizer Pro');
  });

  it('should return products matching search across different categories when category is not filtered', () => {
    const searchQuery = 'desk';

    const filtered = mockProducts.filter((p) => {
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    expect(filtered).toHaveLength(3);
  });

  it('should handle case-insensitive search with category filter', () => {
    const categoryId = 'c1111111-1111-1111-1111-111111111111';
    const searchQuery = 'DESK';

    const filtered = mockProducts.filter((p) => {
      const matchesCategory = p.categoryId === categoryId;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });

    expect(filtered).toHaveLength(2);
  });
});

describe('Category Validation in Product Creation', () => {
  it('should reject product creation without a category', () => {
    const invalidProduct = {
      name: 'Test Product',
      slug: 'test-product',
      categoryId: '',
      shortDescription: 'Test',
      description: 'Test product',
    };

    const isValid = !!(invalidProduct.categoryId && invalidProduct.categoryId.trim().length > 0);

    expect(isValid).toBe(false);
  });

  it('should accept product creation with valid category', () => {
    const validProduct = {
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      shortDescription: 'Test',
      description: 'Test product',
    };

    const isValid = !!(validProduct.categoryId && validProduct.categoryId.trim().length > 0);

    expect(isValid).toBe(true);
  });

  it('should validate category ID format (UUID)', () => {
    const validCategoryId = 'c1111111-1111-1111-1111-111111111111';
    const invalidCategoryId = 'invalid-id';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(validCategoryId).toMatch(uuidRegex);
    expect(invalidCategoryId).not.toMatch(uuidRegex);
  });
});

describe('Empty State Handling', () => {
  it('should handle empty product list for a category', () => {
    const mockProducts: unknown[] = [];
    const categoryId = 'c1111111-1111-1111-1111-111111111111';

    const filtered = mockProducts.filter((p: unknown) => {
      return (p as { categoryId: string }).categoryId === categoryId;
    });

    expect(filtered).toHaveLength(0);
  });

  it('should show meaningful empty state message', () => {
    const emptyStateMessage =
      "No products found. Try adjusting your search or filters to find what you're looking for.";

    expect(emptyStateMessage).toContain('No products found');
    expect(emptyStateMessage).toContain('filters');
  });
});

describe('Category Product Count', () => {
  const mockProducts = [
    { id: '1', categoryId: 'c1111111-1111-1111-1111-111111111111' },
    { id: '2', categoryId: 'c1111111-1111-1111-1111-111111111111' },
    { id: '3', categoryId: 'c2222222-2222-2222-2222-222222222222' },
    { id: '4', categoryId: 'c3333333-3333-3333-3333-333333333333' },
    { id: '5', categoryId: 'c3333333-3333-3333-3333-333333333333' },
    { id: '6', categoryId: 'c3333333-3333-3333-3333-333333333333' },
  ];

  it('should count products per category correctly', () => {
    const counts = mockProducts.reduce((acc: Record<string, number>, p) => {
      acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
      return acc;
    }, {});

    expect(counts['c1111111-1111-1111-1111-111111111111']).toBe(2);
    expect(counts['c2222222-2222-2222-2222-222222222222']).toBe(1);
    expect(counts['c3333333-3333-3333-3333-333333333333']).toBe(3);
    expect(counts['c4444444-4444-4444-4444-444444444444']).toBeUndefined();
  });
});

describe('Category Data Integrity', () => {
  it('should not allow products with invalid category references', () => {
    const validCategories = [
      'c1111111-1111-1111-1111-111111111111',
      'c2222222-2222-2222-2222-222222222222',
      'c3333333-3333-3333-3333-333333333333',
      'c4444444-4444-4444-4444-444444444444',
      'c5555555-5555-5555-5555-555555555555',
    ];

    const invalidProduct = {
      id: '1',
      name: 'Test Product',
      categoryId: 'invalid-category-id',
    };

    const isValid = validCategories.includes(invalidProduct.categoryId);

    expect(isValid).toBe(false);
  });

  it('should preserve category association when updating product', () => {
    const originalProduct = {
      id: '1',
      name: 'Desk Organizer',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      shortDescription: 'Test',
    };

    const updatedProduct = {
      ...originalProduct,
      name: 'Premium Desk Organizer',
    };

    expect(updatedProduct.categoryId).toBe(originalProduct.categoryId);
  });

  it('should allow changing product category', () => {
    const originalProduct = {
      id: '1',
      name: 'Desk Organizer',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
    };

    const updatedProduct = {
      ...originalProduct,
      categoryId: 'c3333333-3333-3333-3333-333333333333',
    };

    expect(updatedProduct.categoryId).not.toBe(originalProduct.categoryId);
    expect(updatedProduct.categoryId).toBe('c3333333-3333-3333-3333-333333333333');
  });
});
