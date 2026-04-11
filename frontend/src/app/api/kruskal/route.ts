import { NextResponse } from "next/server";

class DSU {
  parent: number[];
  rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(i: number): number {
    if (this.parent[i] === i) return i;
    return (this.parent[i] = this.find(this.parent[i]));
  }

  unite(i: number, j: number) {
    const root_i = this.find(i);
    const root_j = this.find(j);
    if (root_i !== root_j) {
      if (this.rank[root_i] < this.rank[root_j]) {
        this.parent[root_i] = root_j;
      } else if (this.rank[root_i] > this.rank[root_j]) {
        this.parent[root_j] = root_i;
      } else {
        this.parent[root_j] = root_i;
        this.rank[root_i]++;
      }
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubs = parseInt(searchParams.get("hubs") || "8");

  // Fallback names to match Architect.cpp logic
  const possibleNames = [
    "Central Warehouse", "Silicon Valley Depot", "Marina Harbor", 
    "Echo Ridge Station", "Sunset Terminal", "Tech Plaza", 
    "Green Valley Hub", "Skyline Port", "Blue Creek Logistics", 
    "Grand Avenue Depot", "South Gate", "North Point"
  ];

  const getHubName = (id: number) => (id < possibleNames.length ? possibleNames[id] : `Generic Hub ${id}`);

  // For a stateless GET request in the fallback, we generate a stable-ish MST
  // based on the hubs count if no edges were passed. 
  // Normally, the UI should provide edges, but for a GET-aligned signature:
  const mstEdges = [];
  let totalCost = 0;
  const dsu = new DSU(hubs);

  // Simple deterministic generation for the fallback MST
  for (let i = 1; i < hubs; i++) {
    const u = i;
    const v = Math.floor(i / 2); // Deterministic "parent"
    const weight = (i % 10) + 1;
    
    dsu.unite(u, v);
    totalCost += weight;
    mstEdges.push({
      src: u,
      dest: v,
      weight: weight,
      srcName: getHubName(u),
      destName: getHubName(v)
    });
  }

  return NextResponse.json({
    status: "success",
    totalCost,
    edges: mstEdges,
  });
}
