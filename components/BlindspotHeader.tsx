export function BlindspotHeader({ subtitle, scopeLabel }: { subtitle?: string; scopeLabel?: string }) {
  return (
    <div className="blindspot-brand">
      <div className="blindspot-brand-mark" aria-hidden="true">
        <svg width="44" height="28" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.5 9.5C9.8 7.2 13.8 6 18 6c4.3 0 8.3 1.2 11.6 3.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M1.8 12.2c3.1-3.9 7.6-6.2 12.7-6.2 5.1 0 9.6 2.3 12.7 6.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M42.2 12.2c-3.1-3.9-7.6-6.2-12.7-6.2-5.1 0-9.6 2.3-12.7 6.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="15.2" cy="16.2" r="5.2" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="28.8" cy="16.2" r="5.2" stroke="currentColor" strokeWidth="2.2" />
          <path d="M20.6 16.2h2.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="blindspot-brand-text">
        <div className="blindspot-brand-title">
          BLINDSPOT<span className="blindspot-tm" aria-hidden="true">TM</span>
        </div>
        <div className="blindspot-brand-sub">{subtitle || "Stories that one side barely sees."}</div>
        {scopeLabel ? <div className="blindspot-scope">{scopeLabel}</div> : null}
      </div>
    </div>
  );
}
