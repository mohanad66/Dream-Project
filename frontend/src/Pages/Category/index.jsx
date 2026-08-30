import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowRight, FaTags } from "react-icons/fa";
import api from "../../services/api";
import Card from "../../Components/Card";
import "./css/style.scss";

export default function CategoryPage({ categories = [], tags = [] }) {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setProducts([]);

      const categoryName =
        categories.find((c) => String(c.id) === String(id))?.name || null;

      try {
        const [catRes, prodRes] = await Promise.all([
          !categoryName
            ? api.get("/api/categories/").catch(() => ({ data: { results: [] } }))
            : Promise.resolve({ data: { results: categories } }),
          api.get(`/api/products/?category=${id}&page_size=24`),
        ]);

        const catList = catRes?.data?.results || catRes?.data || [];
        const found = Array.isArray(catList)
          ? catList.find((c) => String(c.id) === String(id))
          : null;

        if (cancelled) return;
        setCategory(found || { id, name: categoryName || "Category" });
        setProducts(prodRes?.data?.results || prodRes?.data?.products || []);
      } catch (err) {
        console.error("Failed to load category:", err);
        if (cancelled) return;
        setError(err?.response?.data?.detail || "We couldn't load this category right now.");
        if (!categoryName) setCategory({ id, name: "Category" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, categories]);

  return (
    <div className="category-page">
      <nav className="category-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/products">Shop</Link>
        <span>/</span>
        <span className="category-breadcrumb-current">{category?.name || "Category"}</span>
      </nav>

      <header className="category-head">
        <span className="category-head__icon"><FaTags /></span>
        <div>
          <h1>{category?.name || "Category"}</h1>
          <p>Browse products in this category, then watch Shorts to see them in action.</p>
        </div>
        <Link to="/products" className="category-head__explore">
          Browse all products <FaArrowRight />
        </Link>
      </header>

      {loading && (
        <div className="category-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="category-skeleton-card">
              <div className="category-skeleton-card__media" />
              <div className="category-skeleton-card__line w60" />
              <div className="category-skeleton-card__line w40" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="category-empty">
          <h2>We couldn't load this category</h2>
          <p>{error}</p>
          <Link to="/products" className="category-empty__btn">Browse all products</Link>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="category-empty">
          <h2>No products in this category yet</h2>
          <p>Check the full catalogue or discover trending Shorts.</p>
          <Link to="/shorts" className="category-empty__btn">Watch Shorts</Link>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="category-grid">
          {products.map((product) => (
            <Card key={product.id} card={product} categories={categories} tags={tags} />
          ))}
        </div>
      )}
    </div>
  );
}