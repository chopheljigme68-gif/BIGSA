import Link from 'next/link';
import {
  formatDate, formatDateRange, formatBytes, NEWS_CATEGORIES, RESOURCE_CATEGORIES,
  type Sport, type NewsItem, type EventItem, type Resource, type PublicForm,
} from '@bigsa/shared';
import { Img } from './Img';
import c from './cards.module.css';
import u from './ui.module.css';

const SWATCHES = [c.swMaroon, c.swTurquoise, c.swSaffron, c.swClay];

export function SportCard({ sport, index = 0, size = 'rail' }: { sport: Pick<Sport, 'slug' | 'name' | 'name_dz' | 'tagline' | 'cover' | 'has_content'>; index?: number; size?: 'rail' | 'grid' }) {
  return (
    <Link href={`/sports/${sport.slug}`} className={`${c.sport} ${size === 'grid' ? c.sportGrid : ''}`} data-reveal>
      <span className={`${c.tile} ${sport.cover ? '' : SWATCHES[index % SWATCHES.length]}`} data-tilt>
        {sport.cover ? (
          <Img media={sport.cover} sizes="(max-width: 700px) 80vw, 340px" className={c.tileImg} />
        ) : (
          <>
            <span className={c.sportRings} aria-hidden="true" />
            <span className={`display ${c.tileName}`}>{sport.name}</span>
          </>
        )}
        {sport.has_content && sport.tagline ? <span className={c.tileHover}>{sport.tagline}</span> : null}
      </span>
      <span className={c.sportBody}>
        <span className={c.sportName}>{sport.name}</span>
        {sport.name_dz ? <span className={`dz ${c.sportDz}`} lang="dz">{sport.name_dz}</span> : null}
        <span className={c.sportTag}>{sport.has_content ? 'Rules, history and scoring' : 'Entry in preparation'}</span>
      </span>
    </Link>
  );
}

export function NewsCard({ item, variant = 'card' }: { item: NewsItem; variant?: 'card' | 'lead' | 'row' }) {
  return (
    <article className={`${c.news} ${variant === 'lead' ? c.newsLead : variant === 'row' ? c.newsRow : ''}`} data-reveal={variant === 'row' ? 'left' : ''}>
      {item.cover && variant !== 'row' ? (
        <div className={c.newsMedia}>
          <Img media={item.cover} sizes={variant === 'lead' ? '(max-width: 900px) 100vw, 60vw' : '(max-width: 700px) 100vw, 33vw'} />
        </div>
      ) : null}
      <div className={c.newsBody}>
        <p className={c.meta}>
          <span className={c.cat}>{NEWS_CATEGORIES[item.category]}</span>
          <time dateTime={item.published_at ?? undefined}>{formatDate(item.published_at)}</time>
        </p>
        <h3 className={c.newsTitle}>
          <Link href={`/news/${item.slug}`} className={c.stretched}>
            {item.title}
          </Link>
        </h3>
        {item.excerpt && variant !== 'row' ? <p className={c.newsExcerpt}>{item.excerpt}</p> : null}
      </div>
    </article>
  );
}

export function DateBlock({ iso }: { iso: string }) {
  return (
    <span className={c.dateBlock} aria-hidden="true">
      <span className={`display ${c.dateDay}`}>{formatDate(iso, { day: 'numeric' })}</span>
      <span className={c.dateMon}>{formatDate(iso, { month: 'short' })}</span>
      <span className={c.dateYear}>{formatDate(iso, { year: 'numeric' })}</span>
    </span>
  );
}

export function EventRow({ event, dark = false }: { event: EventItem; dark?: boolean }) {
  return (
    <article className={`${c.event} ${dark ? c.eventDark : ''}`} data-reveal="left">
      <DateBlock iso={event.starts_at} />
      <div className={c.eventBody}>
        <h3 className={c.eventTitle}>
          <Link href={`/archives/${event.slug}`} className={c.stretched}>
            {event.title}
          </Link>
        </h3>
        <p className={c.eventMeta}>
          <time dateTime={event.starts_at}>{formatDateRange(event.starts_at, event.ends_at)}</time>
          {event.venue ? <span>{event.venue}</span> : null}
          {event.sport ? <span>{event.sport.name}</span> : null}
        </p>
      </div>
      {event.cover ? (
        <div className={c.eventThumb}>
          <Img media={event.cover} sizes="160px" />
        </div>
      ) : null}
    </article>
  );
}

const FILE_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
};

export function ResourceRow({ resource }: { resource: Resource }) {
  const file = resource.file;
  return (
    <article className={c.resource} data-reveal="fade">
      <span className={c.fileIcon} aria-hidden="true">
        {file ? FILE_LABEL[file.mime] ?? 'File' : 'File'}
      </span>
      <div className={c.resourceBody}>
        <h3 className={c.resourceTitle}>{resource.title}</h3>
        {resource.description ? <p className={c.resourceDesc}>{resource.description}</p> : null}
        <p className={c.resourceMeta}>
          <span>{RESOURCE_CATEGORIES[resource.category]}</span>
          {resource.sport ? <span>{resource.sport.name}</span> : null}
          {file ? <span>{formatBytes(file.size)}</span> : null}
        </p>
      </div>
      {file ? (
        <div className={c.resourceActions}>
          {file.mime === 'application/pdf' ? (
            <a href={`/media/${file.id}`} target="_blank" rel="noopener" className={`${u.btn} ${u.ghost} ${c.smallBtn}`}>
              Preview
            </a>
          ) : null}
          <a href={`/api/resources/${resource.id}/download`} className={`${u.btn} ${u.primary} ${c.smallBtn}`} download>
            Download
          </a>
        </div>
      ) : null}
    </article>
  );
}

const STATUS_TEXT: Record<PublicForm['status'], string> = { open: 'Open', upcoming: 'Opens soon', closed: 'Closed', inactive: 'Not available' };

export function FormStatusPill({ form }: { form: Pick<PublicForm, 'status' | 'opens_at' | 'closes_at'> }) {
  let text = STATUS_TEXT[form.status];
  if (form.status === 'open' && form.closes_at) text = `Open until ${formatDate(form.closes_at)}`;
  if (form.status === 'upcoming' && form.opens_at) text = `Opens ${formatDate(form.opens_at)}`;
  return <span className={`${u.pill} ${u[form.status]}`}>{text}</span>;
}

export function FormCard({ form }: { form: PublicForm }) {
  return (
    <article className={c.form} data-reveal data-tilt>
      <FormStatusPill form={form} />
      <h3 className={c.formTitle}>
        <Link href={`/forms/${form.slug}`} className={c.stretched}>
          {form.title}
        </Link>
      </h3>
      {form.summary ? <p className={c.formSummary}>{form.summary}</p> : null}
      <span className={c.formGo} aria-hidden="true">
        {form.status === 'open' ? 'Start application' : 'View details'}
      </span>
    </article>
  );
}
