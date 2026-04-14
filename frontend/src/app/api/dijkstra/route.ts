import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { nodes, edges, start, end } = body;
  const numNodes = nodes?.length || 0;

  if (numNodes === 0) {
    return NextResponse.json({ status: "error", message: "No nodes in graph." });
  }

  // Map Hub IDs to 0-based internal indices
  const idToIndex = new Map<number, number>();
  nodes.forEach((node: any, index: number) => {
    idToIndex.set(Number(node.id), index);
  });

  const startIndex = idToIndex.get(Number(start));
  const endIndex = idToIndex.get(Number(end));

  if (startIndex === undefined || endIndex === undefined) {
    return NextResponse.json({ 
      status: "error", 
      message: `Invalid Start/End Hub IDs. (Start: ${start}, End: ${end})` 
    });
  }

  const dist = new Array(numNodes).fill(Infinity);
  const parent = new Array(numNodes).fill(-1);
  const visited = new Array(numNodes).fill(false);

  // Adjacency List for Dijkstra
  const adjList: any[][] = Array.from({ length: numNodes }, () => []);
  for (const edge of edges) {
    const uIdx = idToIndex.get(Number(edge.from));
    const vIdx = idToIndex.get(Number(edge.to));
    
    if (uIdx !== undefined && vIdx !== undefined) {
      // It's an undirected graph according to the logic
      adjList[uIdx].push({ to: vIdx, weight: Number(edge.weight) });
      adjList[vIdx].push({ to: uIdx, weight: Number(edge.weight) });
    }
  }

  dist[startIndex] = 0;

  for (let i = 0; i < numNodes; i++) {
    let uIdx = -1;
    for (let j = 0; j < numNodes; j++) {
      if (!visited[j] && (uIdx === -1 || dist[j] < dist[uIdx])) {
        uIdx = j;
      }
    }

    if (uIdx === -1 || dist[uIdx] === Infinity) break;
    visited[uIdx] = true;
    if (uIdx === endIndex) break;

    for (const neighbor of adjList[uIdx]) {
      const vIdx = neighbor.to;
      const weight = neighbor.weight;
      if (dist[uIdx] + weight < dist[vIdx]) {
        dist[vIdx] = dist[uIdx] + weight;
        parent[vIdx] = uIdx;
      }
    }
  }

  if (dist[endIndex] === Infinity) {
    return NextResponse.json({
      status: "error",
      message: "No connected path between these hubs.",
    });
  }

  const pathIndices = [];
  for (let vIdx = endIndex; vIdx !== -1; vIdx = parent[vIdx]) {
    pathIndices.push(vIdx);
  }
  pathIndices.reverse();

  // Convert indices back to original IDs
  const indexToId = nodes.map((n: any) => n.id);
  const path = pathIndices.map(idx => indexToId[idx]);

  return NextResponse.json({
    status: "success",
    cost: dist[endIndex],
    path,
  });
}
