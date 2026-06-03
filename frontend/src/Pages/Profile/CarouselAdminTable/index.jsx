import React, { useState, useCallback } from 'react';
import "./style.scss"

// ── Standalone helper: the visual "slide card" ───────────────
const Spinner = () => (
  <span className="cscard-btn__spinner" aria-hidden="true" />
);

const CarouselSlideCard = ({ item, index, onEdit, onDelete, onToggle, isLoading, pendingAction }) => {
  const [hovered, setHovered] = useState(false);

  const isPending = Boolean(pendingAction);

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    background: hovered
      ? 'linear-gradient(160deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.72) 100%)'
      : 'linear-gradient(160deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.52) 100%)',
    transition: 'all 0.35s ease',
    borderRadius: 'inherit',
  };

  return (
    <div
      className={`carousel-slide-card ${item.is_active ? '' : 'carousel-slide-card--inactive'}  ${isLoading ? 'carousel-slide-card--loading' : ''} ${isPending ? 'carousel-slide-card--pending' : ''}`}
      style={{ '--slide-index': index }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="carousel-slide-card__bg">
        {isLoading ? (
          <div className="carousel-slide-card__skeleton">
            <div className="skeleton-shimmer" />
          </div>
        ) : item.image ? (
          <img src={item.image} alt={item.title} />
        ) : (
          <div className="carousel-slide-card__bg-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {!isLoading && <div style={overlayStyle} />}
      </div>

      <span className="carousel-slide-card__num">#{index + 1}</span>

      <span className={`carousel-slide-card__status ${item.is_active ? 'carousel-slide-card__status--on' : 'carousel-slide-card__status--off'}`}>
        {item.is_active ? '● Live' : '○ Hidden'}
      </span>

      <div className="carousel-slide-card__content">
        <h5 className="carousel-slide-card__title">{item.title || 'Untitled Slide'}</h5>
        {item.subtitle && <p className="carousel-slide-card__sub">{item.subtitle}</p>}
        {item.link && (
          <span className="carousel-slide-card__link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {item.link}
          </span>
        )}
      </div>

      {/* Action strip — stays visible while pending so the spinner is seen */}
      <div className={`carousel-slide-card__actions ${hovered || isPending ? 'carousel-slide-card__actions--visible' : ''}`}>

        <button
          className={`cscard-btn cscard-btn--toggle ${pendingAction === 'toggle' ? 'cscard-btn--spinning' : ''}`}
          onClick={() => onToggle(item.id, item.is_active)}
          title={item.is_active ? 'Hide slide' : 'Show slide'}
          disabled={isPending}
        >
          {pendingAction === 'toggle' ? <Spinner /> : item.is_active ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>

        <button
          className="cscard-btn cscard-btn--edit"
          onClick={() => onEdit(item)}
          title="Edit slide"
          disabled={isPending}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>

        <button
          className={`cscard-btn cscard-btn--delete ${pendingAction === 'delete' ? 'cscard-btn--spinning' : ''}`}
          onClick={() => onDelete(item.id)}
          title="Delete slide"
          disabled={isPending}
        >
          {pendingAction === 'delete' ? <Spinner /> : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
          )}
        </button>

      </div>
    </div>
  );
};

// ── Empty state ──────────────────────────────────────────────
const CarouselEmptyState = ({ onAdd }) => (
  <div className="carousel-empty">
    <div className="carousel-empty__filmstrip">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="carousel-empty__frame" style={{ '--f': i }}>
          <div className="carousel-empty__hole carousel-empty__hole--top" />
          <div className="carousel-empty__hole carousel-empty__hole--bottom" />
        </div>
      ))}
      <div className="carousel-empty__plus">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
      </div>
    </div>
    <p className="carousel-empty__text">No slides yet — start building your carousel</p>
    <button className="button button--primary" onClick={onAdd}>Add First Slide</button>
  </div>
);

// ── Mini live-preview strip ──────────────────────────────────
const CarouselPreviewStrip = ({ items }) => {
  const active = items.filter(i => i.is_active);
  if (!active.length) return null;
  return (
    <div className="carousel-preview-strip">
      <span className="carousel-preview-strip__label">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        Preview order
      </span>
      <div className="carousel-preview-strip__track">
        {active.map((item, i) => (
          <div key={item.id} className="carousel-preview-strip__thumb">
            {item.image ? <img src={item.image} alt={item.title} /> : <div className="carousel-preview-strip__placeholder" />}
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main exported section ────────────────────────────────────
export const CarouselManagementSection = ({
  carouselItems = [],
  carouselLoading = false,
  carouselPagination = { count: 0, next: null, previous: null, currentPage: 1 },
  onRefreshCarousel,
  onOpenCarouselModal,
  onDeleteCarousel,
  onToggleCarousel,
}) => {
  const totalPages = Math.ceil(carouselPagination.count / 10) || 1;

  // { [itemId]: 'toggle' | 'delete' }
  const [pendingActions, setPendingActions] = useState({});

  const setPending = useCallback((id, action) => {
    setPendingActions(prev => ({ ...prev, [id]: action }));
  }, []);

  const clearPending = useCallback((id) => {
    setPendingActions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleToggle = useCallback(async (id, currentStatus) => {
    if (pendingActions[id]) return;
    setPending(id, 'toggle');
    try {
      await onToggleCarousel(id, currentStatus);
    } finally {
      clearPending(id);
    }
  }, [pendingActions, setPending, clearPending, onToggleCarousel]);

  const handleDelete = useCallback(async (id) => {
    if (pendingActions[id]) return;
    setPending(id, 'delete');
    try {
      await onDeleteCarousel(id);
    } finally {
      clearPending(id);
    }
  }, [pendingActions, setPending, clearPending, onDeleteCarousel]);

  return (
    <div className="carousel-management-section management-section">
      <div className="carousel-mgmt-header">
        <div className="carousel-mgmt-header__left">
          <div className="carousel-mgmt-header__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="10" rx="2" />
              <path d="M17 12H7M7 12l3-3M7 12l3 3" />
            </svg>
          </div>
          <div>
            <h4 className="carousel-mgmt-header__title">
              Carousel Slides
              <span className="carousel-mgmt-header__count">{carouselPagination.count}</span>
            </h4>
            <p className="carousel-mgmt-header__sub">
              {carouselItems.filter(i => i.is_active).length} live · {carouselItems.filter(i => !i.is_active).length} hidden
            </p>
          </div>
        </div>
        <div className="carousel-mgmt-header__right">
          <button className="button button--secondary button--small" onClick={() => onRefreshCarousel(1)} disabled={carouselLoading}>
            {carouselLoading ? 'Refreshing…' : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>Refresh</>)}
          </button>
          <button className="button button--primary button--small carousel-add-btn" onClick={() => onOpenCarouselModal(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Slide
          </button>
        </div>
      </div>

      <CarouselPreviewStrip items={carouselItems} />

      {carouselLoading ? (
        <div className="carousel-skeleton-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="carousel-skeleton-card" style={{ '--i': i }}>
              <div className="skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : carouselItems.length > 0 ? (
        <div className="carousel-cards-grid">
          {carouselItems.map((item, index) => (
            <CarouselSlideCard
              key={item.id}
              item={item}
              index={index}
              onEdit={(item) => onOpenCarouselModal(item)}
              onDelete={handleDelete}
              onToggle={handleToggle}
              pendingAction={pendingActions[item.id] || null}
            />
          ))}
          <button className="carousel-add-ghost" onClick={() => onOpenCarouselModal(null)}>
            <div className="carousel-add-ghost__inner">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span>Add Slide</span>
            </div>
          </button>
        </div>
      ) : (
        <CarouselEmptyState onAdd={() => onOpenCarouselModal(null)} />
      )}

      {carouselItems.length > 0 && (
        <div className="pagination-controls">
          <button onClick={() => onRefreshCarousel(carouselPagination.currentPage - 1)} disabled={!carouselPagination.previous || carouselLoading} className="button">Previous</button>
          <span>Page {carouselPagination.currentPage} of {totalPages} ({carouselPagination.count} total)</span>
          <button onClick={() => onRefreshCarousel(carouselPagination.currentPage + 1)} disabled={!carouselPagination.next || carouselLoading} className="button">Next</button>
        </div>
      )}
    </div>
  );
};

export default CarouselManagementSection;