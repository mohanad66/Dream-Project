import { useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import "./css/style.scss";
import useFancybox from "../FancyBox";

const INTERVAL_MS = 5000;

const Carousel = ({ images = [] }) => {
  const slides = Array.isArray(images)
    ? images.filter((item) => item && item.image)
    : [];

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [fancyboxRef] = useFancybox({});

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent((prev) => (prev + 1) % slides.length);
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (current >= slides.length && slides.length > 0) {
      setCurrent(0);
    }
  }, [slides.length, current]);

  if (slides.length === 0) return null;

  const goTo = (index) => {
    setCurrent((index + slides.length) % slides.length);
  };

  const handleMouseEnter = () => {
    pausedRef.current = true;
    setPaused(true);
  };

  const handleMouseLeave = () => {
    pausedRef.current = false;
    setPaused(false);
  };

  return (
    <section
      className="showcase-carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-paused={paused}
    >
      <div className="section-heading">
        <p className="section-eyebrow">The Showcase</p>
        <h2 className="title">Curated Moments</h2>
      </div>

      <div className="showcase-stage" ref={fancyboxRef}>
        {slides.map((slide, index) => (
          <div
            key={slide.id ?? `slide-${index}`}
            className={`showcase-slide ${index === current ? "active" : ""}`}
          >
            <a
              data-fancybox="showcase"
              href={slide.image}
              className="showcase-link"
            >
              <img
                src={slide.image}
                alt={slide.name || `Showcase ${index + 1}`}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </a>

            <div className="showcase-shade" aria-hidden="true" />

            {slide.name && (
              <div className="showcase-caption">
                <span className="caption-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{slide.name}</h3>
              </div>
            )}
          </div>
        ))}

        {slides.length > 1 && (
          <>
            <button
              className="showcase-arrow prev"
              onClick={() => goTo(current - 1)}
              aria-label="Previous showcase image"
            >
              <FaChevronLeft />
            </button>
            <button
              className="showcase-arrow next"
              onClick={() => goTo(current + 1)}
              aria-label="Next showcase image"
            >
              <FaChevronRight />
            </button>
          </>
        )}

        {slides.length > 1 && (
          <div className="showcase-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id ?? `dot-${index}`}
                className={`showcase-dot ${index === current ? "active" : ""}`}
                onClick={() => goTo(index)}
                aria-label={`Go to showcase image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Carousel;
