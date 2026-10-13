import type { MoverRow, MoversResult } from "../../lib/markets/topMovers";

/** NSE attribution as the permission letter requires it. Shown on every panel that carries NSE data. */
const NOTICE = "Source: NSE · delayed · not investment advice";

function istTime(iso: string | null): string {
  if (!iso) return "time not disclosed";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "time not disclosed";
  const label = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${label} IST`;
}

function Column({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: readonly MoverRow[];
  emptyText: string;
}) {
  return (
    <div>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <ol>
          {rows.map((r) => (
            <li key={r.symbol}>
              <a href={`/stock/${encodeURIComponent(r.symbol)}`}>{r.symbol}</a>{" "}
              <span>{r.name}</span> <span>{r.price.toFixed(2)}</span>{" "}
              <span>{`${r.change > 0 ? "+" : ""}${r.change.toFixed(2)}%`}</span>{" "}
              <span>{istTime(r.observedAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TopMoversPanel({ result }: { result: MoversResult }) {
  return (
    <section aria-label="Top movers">
      <h2>Top movers</h2>
      {result.status === "insufficient" ? (
        <p>{`Waiting for quotes: ${result.eligible} of ${result.considered} have a fresh, dated change.`}</p>
      ) : null}
      <Column title="Top 5 winners" rows={result.winners} emptyText="No stock is up in the fresh quotes." />
      <Column title="Top 5 losers" rows={result.losers} emptyText="No stock is down in the fresh quotes." />
      <Column title="Top 5 movers" rows={result.movers} emptyText="No moves in the fresh quotes." />
      <p>{NOTICE}</p>
    </section>
  );
}
