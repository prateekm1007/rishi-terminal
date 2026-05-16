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

  console.log("\nSnapshot Health Check");
  console.log("=".repeat(50));

  console.log(`Rows today: ${rows.length}`);

  const missingScore = rows.filter((r:any) =>
    r.consensus_score === null || r.consensus_score === undefined
  );

  const badSignal = rows.filter((r:any) =>
    !["BUY","HOLD","SELL"].includes(r.signal)
  );

  console.log(`Missing scores: ${missingScore.length}`);
  console.log(`Invalid signals: ${badSignal.length}`);

  const avg =
    rows.reduce((a:any,b:any) => a + Number(b.consensus_score || 0), 0)
    / Math.max(rows.length, 1);

  console.log(`Average score: ${avg.toFixed(2)}`);

  const buy =
    rows.filter((r:any) => r.signal === "BUY").length;

  const hold =
    rows.filter((r:any) => r.signal === "HOLD").length;

  const sell =
    rows.filter((r:any) => r.signal === "SELL").length;

  console.log(`BUY:  ${buy}`);
  console.log(`HOLD: ${hold}`);
  console.log(`SELL: ${sell}`);

  console.log("\nHealth complete.");
}

run().catch(console.error);