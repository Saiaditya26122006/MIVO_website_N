import { ExplorePageClient } from "./ExplorePageClient";
import { getProducts, getCategories } from "@/services/products.service";

export default async function ExplorePage() {
  // Load data server-side
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return <ExplorePageClient initialProducts={products} initialCategories={categories} />;
}
