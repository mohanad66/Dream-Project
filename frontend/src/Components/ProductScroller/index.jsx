import React, { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Card from "../Card";
import "./css/style.scss";

export default function ProductScroller({
  eyebrow,
  title,
  items = [],
  categories = [],
  tags = [],
}) {
  const scrollerRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="product-scroller">
      <div className="product-scroller-head">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className="title">{title}</h2>
        </div>
        <div className="product-scroller-nav">
          <button className="scroller-arrow" onClick={() => scrollByAmount(-1)} aria-label="Scroll left">
            <FaChevronLeft />
          </button>
          <button className="scroller-arrow" onClick={() => scrollByAmount(1)} aria-label="Scroll right">
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="product-scroller-track" ref={scrollerRef}>
        {items.map((item) => (
          <div className="product-scroller-item" key={item.id}>
            <Card card={item} categories={categories} tags={tags} />
          </div>
        ))}
      </div>
    </section>
  );
}