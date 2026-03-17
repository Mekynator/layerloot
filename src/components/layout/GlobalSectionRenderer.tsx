import React from "react";
import { Link } from "react-router-dom";

type UnknownRecord = Record<string, any>;

export interface GlobalSectionRendererProps {
  section?: UnknownRecord | null;
  block?: UnknownRecord | null;
  item?: UnknownRecord | null;
  data?: UnknownRecord | null;
  sections?: UnknownRecord[] | null;
  blocks?: UnknownRecord[] | null;
  items?: UnknownRecord[] | null;
  page?: string;
  className?: string;
  fallback?: React.ReactNode;
  [key: string]: any;
}

function safeArray(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) return value.filter(Boolean) as UnknownRecord[];
  return [];
}

function textValue(value: unknown, defaultValue = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return defaultValue;
}

function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function renderLink(item: UnknownRecord, key: React.Key) {
  const label = textValue(firstDefined(item.label, item.title, item.name), "Link");
  const href = textValue(firstDefined(item.href, item.url, item.link), "#");
  const external = /^https?:\/\//i.test(href);

  if (external) {
    return (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      key={key}
      to={href}
      className="text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      {label}
    </Link>
  );
}

function renderSingleBlock(source: UnknownRecord, index: number) {
  const content = (source.content ?? source.data ?? {}) as UnknownRecord;
  const title = textValue(firstDefined(source.title, content.title, source.name));
  const description = textValue(
    firstDefined(
      source.description,
      content.description,
      source.subtitle,
      content.subtitle,
      content.text
    )
  );
  const links = safeArray(firstDefined(content.links, source.links, content.items, source.items));
  const image = textValue(
    firstDefined(content.image, source.image, content.image_url, source.image_url)
  );

  return (
    <section key={source.id ?? `${title}-${index}`} className="space-y-3">
      {title && (
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      )}

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {image && (
        <img
          src={image}
          alt={title || "Section image"}
          className="max-h-24 w-auto rounded-lg border border-border object-cover"
          loading="lazy"
        />
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {links.map((item, i) => renderLink(item, i))}
        </div>
      )}
    </section>
  );
}

export default function GlobalSectionRenderer(props: GlobalSectionRendererProps) {
  const sources = safeArray(
    firstDefined(
      props.sections,
      props.blocks,
      props.items,
      props.section ? [props.section] : undefined,
      props.block ? [props.block] : undefined,
      props.item ? [props.item] : undefined,
      props.data ? [props.data] : undefined
    )
  );

  if (sources.length === 0) {
    return <>{props.fallback ?? null}</>;
  }

  return (
    <div className={props.className ?? "space-y-6"}>
      {sources.map((source, index) => renderSingleBlock(source, index))}
    </div>
  );
}
