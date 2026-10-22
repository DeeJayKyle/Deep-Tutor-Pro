import { useId, useState, type CSSProperties } from 'react';

// Small, dependency-free SVG charts. One series each, so no legend box: the
// card title names what is plotted. Marks use --chart-1 (validated against both
// panel surfaces); all text uses text tokens. Every chart has a hover tooltip
// and an accessible text description; the full numbers stay in the tables.

export interface Datum {
  label: string;
  value: number;
  detail?: string; // tooltip line
  id?: string; // React key when labels may repeat
}

/** Vertical columns, e.g. how many students fall in each 10-point band. */
export function ColumnChart({ data, height = 160, reference, ariaLabel, unit = '' }: { data: Datum[]; height?: number; reference?: { atIndex: number; label: string }; ariaLabel: string; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const slot = 40; // viewBox units per column; the SVG scales proportionally to the card
  const padL = 28;
  const padB = 22;
  const plotH = height - padB - 8;
  const width = padL + slot * data.length;
  const barW = 24;
  return (
    <figure className="relative m-0" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="sr-only">
        {ariaLabel}: {data.map((d) => `${d.label} ${d.value}${unit}`).join(', ')}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" aria-hidden="true">
        {ticks.map((t) => {
          const y = 8 + plotH - (t / top) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={width} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / top) * plotH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = 8 + plotH - h;
          const r = Math.min(4, h / 2, barW / 2);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Hit target: the whole slot, taller than the mark. */}
              <rect x={padL + i * slot} y={8} width={slot} height={plotH} fill="transparent" />
              {h > 0 && <path d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`} fill="var(--chart-1)" opacity={hover === null || hover === i ? 1 : 0.55} />}
              <text x={padL + i * slot + slot / 2} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">
                {d.label}
              </text>
            </g>
          );
        })}
        {reference && (
          <g>
            <line x1={padL + reference.atIndex * slot} x2={padL + reference.atIndex * slot} y1={4} y2={8 + plotH} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
            <text x={padL + reference.atIndex * slot + 4} y={12} fontSize={9} fill="var(--ink)">
              {reference.label}
            </text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 w-max max-w-[60%] rounded-md border border-line bg-panel px-2 py-1 text-xs shadow-lg" style={tooltipPosition(((padL + hover * slot + slot / 2) / width) * 100)}>
          <div className="font-semibold">{data[hover].label}</div>
          <div className="text-muted">{data[hover].detail ?? `${data[hover].value}${unit}`}</div>
        </div>
      )}
    </figure>
  );
}

/** Keep the tooltip inside the chart: anchor it from the nearer edge. */
function tooltipPosition(xPct: number): CSSProperties {
  return xPct < 50 ? { left: `max(0px, calc(${xPct}% - 40px))` } : { right: `max(0px, calc(${100 - xPct}% - 40px))` };
}

/** Horizontal meters: one row per item, value out of max, e.g. notes coverage per unit. */
export function MeterList({ rows, max = 100, unit = '%', ariaLabel }: { rows: (Datum & { href?: string; valueText?: string })[]; max?: number; unit?: string; ariaLabel: string }) {
  return (
    <ul aria-label={ariaLabel} className="space-y-2.5">
      {rows.map((r) => {
        const pct = Math.max(0, Math.min(1, r.value / (max || 1)));
        const label = r.href ? (
          <a href={r.href} className="truncate hover:text-accent">
            {r.label}
          </a>
        ) : (
          <span className="truncate">{r.label}</span>
        );
        return (
          <li key={r.id ?? r.label} title={r.detail}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              {label}
              <span className="shrink-0 tabular-nums text-muted">
                {r.valueText ?? `${Math.round(r.value * 10) / 10}${unit}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'color-mix(in oklab, var(--chart-1) 18%, transparent)' }} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={r.value} aria-valuetext={r.valueText} aria-label={r.label}>
              <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: 'var(--chart-1)' }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function niceTicks(max: number): number[] {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100];
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const out: number[] = [];
  for (let t = 0; t <= max + step - 1e-9; t += step) out.push(t);
  return out;
}

/** Count values into 10-point bands 0–9 … 90–100. */
export function bandCounts(values: number[]): Datum[] {
  const bins = Array.from({ length: 10 }, (_, i) => ({ label: i === 9 ? '90+' : `${i * 10}s`, value: 0, detail: '' }));
  for (const v of values) bins[Math.min(9, Math.max(0, Math.floor(v / 10)))].value += 1;
  bins.forEach((b, i) => (b.detail = `${b.value} student${b.value === 1 ? '' : 's'} scored ${i * 10}–${i === 9 ? 100 : i * 10 + 9}%`));
  return bins;
}
