import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let hubs = parseInt(searchParams.get("hubs") || "8");
  if (hubs < 2 || hubs > 50) hubs = 8;

  const possibleNames = [
    "Central Warehouse", "Silicon Valley Depot", "Marina Harbor", 
    "Echo Ridge Station", "Sunset Terminal", "Tech Plaza", 
    "Green Valley Hub", "Skyline Port", "Blue Creek Logistics", 
    "Grand Avenue Depot", "South Gate", "North Point"
  ];

  const getHubName = (id: number) => (id < possibleNames.length ? possibleNames[id] : `Hub ${id}`);

  const nodes = [];
  const edges: any[] = [];

  // Step 1: Create Hubs (Nodes)
  for (let i = 0; i < hubs; i++) {
    nodes.push({ id: i, label: getHubName(i) });
  }

  // Step 2: Ensure the graph is connected (Spanning Tree logic)
  for (let i = 1; i < hubs; i++) {
    const u = i;
    const v = Math.floor(Math.random() * i); // Connect to a random existing hub
    const weight = Math.floor(Math.random() * 10) + 1; // 1 to 10
    edges.push({ from: u, to: v, weight, label: `${weight}`, id: `e${edges.length}` });
  }

  // Step 3: Add extra random edges for alternative routes
  const extraEdgesCount = hubs * 2;
  for (let i = 0; i < extraEdgesCount; i++) {
    const u = Math.floor(Math.random() * hubs);
    const v = Math.floor(Math.random() * hubs);
    if (u !== v) {
      const exists = edges.some(e => (e.from === u && e.to === v) || (e.from === v && e.to === u));
      if (!exists) {
        const weight = Math.floor(Math.random() * 10) + 1;
        edges.push({ from: u, to: v, weight, label: `${weight}`, id: `e${edges.length}` });
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}
