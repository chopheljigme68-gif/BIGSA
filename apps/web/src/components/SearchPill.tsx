import s from './search.module.css';

/** The large rounded search bar. A plain GET form, so it works before JavaScript loads. */
export function SearchPill({ defaultValue = '', defaultType = '' }: { defaultValue?: string; defaultType?: string }) {
  return (
    <form action="/search" role="search" className={s.pill}>
      <label htmlFor="hero-q" className="visually-hidden">
        Search BIGSA
      </label>
      <input id="hero-q" name="q" type="search" defaultValue={defaultValue} placeholder="What are you looking for?" className={s.input} autoComplete="off" />
      <label htmlFor="hero-type" className="visually-hidden">
        Search in
      </label>
      <select id="hero-type" name="type" defaultValue={defaultType} className={s.scope}>
        <option value="">Everything</option>
        <option value="sport">Sports</option>
        <option value="resource">Rules & documents</option>
        <option value="form">Forms</option>
        <option value="news">News</option>
        <option value="event">Events</option>
      </select>
      <button type="submit" className={s.go} aria-label="Search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      </button>
    </form>
  );
}
