export function TopNavSkeleton() {
  return (
    <header className="topbar topbar-skeleton" aria-hidden="true">
      <div className="container topbar-main">
        <div className="loading-block loading-line-sm" />
        <div className="loading-block loading-line-lg" />
        <div className="loading-block loading-line-sm" />
      </div>
      <div className="trending-strip">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span key={idx} className="trending-item loading-chip">
            <span className="loading-block loading-line-sm" />
          </span>
        ))}
      </div>
    </header>
  );
}
