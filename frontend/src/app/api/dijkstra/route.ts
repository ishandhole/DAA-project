import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = parseInt(searchParams.get("start") || "0");
  const end = parseInt(searchParams.get("end") || "1");

  // Fallback map generation for the stateless GET handler
  const hubsCount = 12; 
  const nodes = Array.from({ length: hubsCount }, (_, i) => ({ id: i }));
  const edges: any[] = [];
  for (let i = 0; i < hubsCount - 1; i++) {
    edges.push({ from: i, to: i + 1, weight: 1 });
  }

  const numNodes = nodes.length;
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

  const adjList: any[][] = Array.from({ length: numNodes }, () => []);
  for (const edge of edges) {
    const uIdx = idToIndex.get(Number(edge.from));
    const vIdx = idToIndex.get(Number(edge.to));
    if (uIdx !== undefined && vIdx !== undefined) {
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
    return NextResponse.json({ status: "error", message: "No path found in fallback map." });
  }

  const pathIndices = [];
  for (let vIdx = endIndex; vIdx !== -1; vIdx = parent[vIdx]) {
    pathIndices.push(vIdx);
  }
  pathIndices.reverse();

  const indexToId = nodes.map((n: any) => n.id);
  const path = pathIndices.map(idx => indexToId[idx]);

  return NextResponse.json({
    status: "success",
    cost: dist[endIndex],
    path,
  });
}
