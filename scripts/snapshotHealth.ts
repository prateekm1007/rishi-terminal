// SNAPSHOT_HEALTH_V1

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const HEADERS = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
};

async function run() {
  const today = new Date().toISOString().slice(0,10);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rishi_snapshots?select=symbol,consensus_score,signal&snapshot_date=eq.${today}`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    throw new Error(`Supabase query failed: ${res.status}`);
  }

  const rows = await res.json();

/** A rishi_snapshots row as read by the health check (N9: typed — was any). */
interface SnapshotHealthRow {
  consensus_score: number | null;
  signal: string;
}

  console.log("\nSnapshot Health Check");
  console.log("=".repeat(50));

  console.log(`Rows today: ${rows.length}`);

  const missingScore = rows.filter((r: SnapshotHealthRow) =>
    r.consensus_score === null || r.consensus_score === undefined
  );

  // Round-48: the descriptive signal union (matches rishiMemory.ts)
  const badSignal = rows.filter((r: SnapshotHealthRow) =>
    !["FAVORABLE","BALANCED","UNFAVORABLE"].includes(r.signal)
  );

  console.log(`Missing scores: ${missingScore.length}`);
  console.log(`Invalid signals: ${badSignal.length}`);

  const avg =
    rows.reduce((a: number, b: SnapshotHealthRow) => a + Number(b.consensus_score || 0), 0)
    / Math.max(rows.length, 1);

  console.log(`Average score: ${avg.toFixed(2)}`);

  const favorable =
    rows.filter((r: SnapshotHealthRow) => r.signal === "FAVORABLE").length;

  const balanced =
    rows.filter((r: SnapshotHealthRow) => r.signal === "BALANCED").length;

  const unfavorable =
    rows.filter((r: SnapshotHealthRow) => r.signal === "UNFAVORABLE").length;

  console.log(`FAVORABLE:   ${favorable}`);
  console.log(`BALANCED:    ${balanced}`);
  console.log(`UNFAVORABLE: ${unfavorable}`);

  console.log("\nHealth complete.");
}

run().catch(console.error);