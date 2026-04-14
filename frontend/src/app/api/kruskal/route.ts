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

export async function POST(request: Request) {
  const body = await request.json();
  const { edges, nodes } = body;

  const getHubName = (id: number) => {
    const node = nodes?.find((n: any) => n.id === id);
    return node ? node.label : `Hub ${id}`;
  };

  // Extract unique node IDs from edges to map them safely to 0..N-1
  const allNodeIds = new Set<number>();
  edges.forEach((e: any) => {
    allNodeIds.add(Number(e.from));
    allNodeIds.add(Number(e.to));
  });

  const idToIndex = new Map<number, number>();
  Array.from(allNodeIds).forEach((id, index) => {
    idToIndex.set(id, index);
  });

  if (allNodeIds.size === 0) {
     return NextResponse.json({ status: "success", totalCost: 0, edges: [] });
  }

  const sortedEdges = [...edges].sort((a, b) => Number(a.weight) - Number(b.weight));
  const dsu = new DSU(allNodeIds.size);
  let totalCost = 0;
  const mstEdges = [];

  for (const edge of sortedEdges) {
    const uIdx = idToIndex.get(Number(edge.from))!;
    const vIdx = idToIndex.get(Number(edge.to))!;

    if (dsu.find(uIdx) !== dsu.find(vIdx)) {
      dsu.unite(uIdx, vIdx);
      totalCost += Number(edge.weight);
      mstEdges.push({
        src: edge.from,
        dest: edge.to,
        weight: Number(edge.weight),
        srcName: getHubName(edge.from),
        destName: getHubName(edge.to)
      });
    }
  }

  return NextResponse.json({
    status: "success",
    totalCost,
    edges: mstEdges,
  });
}
