"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, Box, RefreshCw, Cpu, CheckCircle } from "lucide-react";

// API_BASE: Points to our internal Next.js API Routes (Serverless)
const API_BASE = "/api";

type LogType = { text: string; type: "normal" | "success" | "highlight" | "error" };

const PACKAGES = [
  { name: "Medical Supplies", weight: 5, value: 50 },
  { name: "Electronics", weight: 8, value: 80 },
  { name: "Office Chairs", weight: 12, value: 60 },
  { name: "Luxury Goods", weight: 3, value: 100 },
  { name: "Food Rations", weight: 7, value: 40 },
];

/**
 * [COMPONENT] CityFlowDashboard
 * This is the UI layer of the DAA Project.
 * It serves as a "Visual Proxy" for the C++ backend.
 */
export default function CityFlowDashboard() {
  // ----------------------------------------------------------------------------------
  // STATE MANAGEMENT: Reactive variables that hold algorithmic results
  // ----------------------------------------------------------------------------------
  const [hubs, setHubs] = useState<number>(8);
  const [startHub, setStartHub] = useState<number>(0);
  const [endHub, setEndHub] = useState<number>(4);
  const [knapsackLimit, setKnapsackLimit] = useState<number>(20);
  const [logs, setLogs] = useState<LogType[]>([]);
  const [hubList, setHubList] = useState<{ id: number; label: string }[]>([]);
  
  // DP Visualization State: Holds the data returned from Algorithm 3 (Knapsack)
  const [inventory, setInventory] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [viewMode, setViewMode] = useState<"logs" | "matrix">("logs");
  
  // VISUALIZATION REFS: Direct handles to the Vis.js Graph canvas
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<any>(null);
  const nodesDataSet = useRef<any>(null);
  const edgesDataSet = useRef<any>(null);

  // Helper: Logs system messages to the onscreen terminal
  const addLog = (text: string, type: LogType["type"] = "normal") => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const getHubName = (id: number) => hubList.find((h) => h.id === id)?.label || `Hub ${id}`;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ----------------------------------------------------------------------------------
  // INITIALIZATION: Setup the Graph Environment on component mount
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    const loadVis = async () => {
      // Dynamic import to support client-side rendering (Next.js specific)
      const { Network } = await import("vis-network");
      const { DataSet } = await import("vis-data");
      
      nodesDataSet.current = new DataSet();
      edgesDataSet.current = new DataSet();

      if (networkRef.current) {
        const data = { nodes: nodesDataSet.current, edges: edgesDataSet.current };
        const options = {
          nodes: { shape: "dot", size: 16, font: { size: 14, color: "#fff" }, color: { background: "#38bdf8", border: "#1e293b" } },
          edges: { width: 2, color: { color: "rgba(255, 255, 255, 0.4)" }, font: { size: 12, align: "top", color: "#94a3b8" } },
          physics: { enabled: true, barnesHut: { springLength: 150 } },
        };
        networkInstance.current = new Network(networkRef.current, data, options);
      }
      
      handleGenerateMap(); 
    };

    loadVis();

    return () => { if (networkInstance.current) networkInstance.current.destroy(); };
  }, []);

  // ----------------------------------------------------------------------------------
  // API INTEGRATION: Triggering the C++ Algorithms via HTTP
  // ----------------------------------------------------------------------------------
  
  // [PROCESS] Map Generation: Populates the Initial Graph Data
  const handleGenerateMap = async () => {
    addLog(`[SYSTEM] Initializing City Graph with ${hubs} Hubs...`);
    try {
      const res = await fetch(`${API_BASE}/generateMap?hubs=${hubs}`);
      const data = await res.json();
      nodesDataSet.current.clear();
      edgesDataSet.current.clear();
      nodesDataSet.current.add(data.nodes);
      edgesDataSet.current.add(data.edges);
      setHubList(data.nodes);
    } catch (err) { addLog("C++ Connection Failed. Ensure Backend is running.", "error"); }
  };

  // [ALGO 1] Kruskal's MST Visualization logic
  const handleKruskal = async () => {
    addLog("[ALGORITHM] Triggering Kruskal's MST (Greedy Paradigm)...", "highlight");
    try {
      const res = await fetch(`${API_BASE}/kruskal`);
      const data = await res.json();
      addLog(`Calculation Complete. Minimum Road Cost: $${data.totalCost} Mil`, "success");
      
      // Animate the result found by the Greedy DSU logic in C++
      for (const edge of data.edges) {
        // Fix: Undirected Graph Logic. Check both (src->dest) and (dest->src) directions.
        const match = edgesDataSet.current.get().find((e: any) => 
          (e.from === edge.src && e.to === edge.dest) || 
          (e.from === edge.dest && e.to === edge.src)
        );
        if (match) {
          edgesDataSet.current.update({ id: match.id, color: "#38bdf8", width: 4 });
          addLog(`[GREEDY CHOICE] ${edge.srcName} <==> ${edge.destName} | Weight: ${edge.weight}`);
          await sleep(200);
        }
      }
    } catch (err) { addLog("API Error.", "error"); }
  };

  // [ALGO 2] Dijkstra's Navigation Visualization logic
  const handleDijkstra = async () => {
    addLog(`[ALGORITHM] Triggering Dijkstra's GPS (Greedy + Heap)...`, "highlight");
    try {
      const res = await fetch(`${API_BASE}/dijkstra?start=${startHub}&end=${endHub}`);
      const data = await res.json();
      addLog(`Fastest Route Distance Found: ${data.cost} KM`, "success");
      
      // Replay the path reconstruction logic performed in C++
      for (let i = 0; i < data.path.length; i++) {
        nodesDataSet.current.update({ id: data.path[i], color: { background: "#22c55e", border: "#166534" } });
        addLog(`[PATH] Navigating to ${getHubName(data.path[i])}`);
        if (i > 0) {
          const prev = data.path[i-1], curr = data.path[i];
          const routeEdge = edgesDataSet.current.get().find((e: any) => (e.from === prev && e.to === curr) || (e.from === curr && e.to === prev));
          if (routeEdge) edgesDataSet.current.update({ id: routeEdge.id, color: "#22c55e", width: 5 });
        }
        await sleep(400);
      }
    } catch (err) { addLog("API Error.", "error"); }
  };

  // [ALGO 3] 0/1 Knapsack (DP) Visualization logic
  const handleKnapsack = async () => {
    addLog(`[ALGORITHM] Triggering 0/1 Knapsack (Dynamic Programming)...`, "highlight");
    try {
      const res = await fetch(`${API_BASE}/knapsack?limit=${knapsackLimit}`);
      const data = await res.json();
      setInventory(data.inventory);
      setMatrix(data.matrix); // Receiving the 2D Memoization Table
      addLog(`[SUCCESS] Optimal Revenue Calculated: $${data.maxRevenue}`, "success");
      for (const pkg of data.loaded) {
        addLog(`[LOADED] ${pkg.name} | Profit: $${pkg.value}`);
        await sleep(300);
      }
      setViewMode("matrix"); // Reveal the DP Matrix to the examiner
    } catch (err) { addLog("API Error.", "error"); }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 p-4 gap-4 font-sans overflow-hidden">
      {/* Sidebar: Dashboard Controls */}
      <div className="w-1/4 h-full glass-panel rounded-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">CityFlow 2.0 Engine</h1>
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">1. Infrastructure Generation</label>
            <div className="flex gap-2">
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" value={hubs} onChange={e => setHubs(parseInt(e.target.value) || 0)} />
              <button onClick={handleGenerateMap} className="bg-slate-700 hover:bg-slate-600 p-2 rounded transition"><RefreshCw size={18}/></button>
            </div>
          </div>
          <button onClick={handleKruskal} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-between">
            <span>Run Kruskal's (Greedy)</span><Cpu size={18}/>
          </button>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">2. GPS Route Solver</label>
            <div className="flex items-center gap-2 mb-3">
              <select className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-white" value={startHub} onChange={e => setStartHub(parseInt(e.target.value))}>
                {hubList.map(hub => <option key={hub.id} value={hub.id}>{hub.label}</option>)}
              </select>
              <span className="text-slate-500">→</span>
              <select className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs text-white" value={endHub} onChange={e => setEndHub(parseInt(e.target.value))}>
                {hubList.map(hub => <option key={hub.id} value={hub.id}>{hub.label}</option>)}
              </select>
            </div>
            <button onClick={handleDijkstra} className="w-full bg-green-600 hover:bg-green-500 text-sm font-semibold py-2 rounded-lg transition">Find Path (Dijkstra)</button>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">3. Capacity Optimizer</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm mb-3" value={knapsackLimit} onChange={e => setKnapsackLimit(parseInt(e.target.value) || 0)} />
            <button onClick={handleKnapsack} className="w-full bg-purple-600 hover:bg-purple-500 text-sm font-semibold py-2 rounded-lg transition">Optimize Load (DP)</button>
          </div>
        </div>
      </div>

      <div className="w-3/4 h-full flex flex-col gap-4">
        {/* Visualization Canvas */}
        <div className="flex-grow glass-panel rounded-2xl relative overflow-hidden bg-slate-950">
          <div ref={networkRef} className="w-full h-full"></div>
        </div>

        {/* Dynamic Programming Matrix Explorer & Terminal */}
        <div className="h-80 glass-panel rounded-2xl p-4 flex flex-col font-mono text-xs overflow-hidden">
          <div className="border-b border-slate-700 pb-2 mb-2 flex justify-between">
            <div className="flex gap-4">
              <button onClick={() => setViewMode("logs")} className={`px-3 py-1 rounded ${viewMode === "logs" ? "bg-sky-600" : "text-slate-500"}`}>System Logs</button>
              <button disabled={matrix.length === 0} onClick={() => setViewMode("matrix")} className={`px-3 py-1 rounded ${viewMode === "matrix" ? "bg-sky-600" : "text-slate-500"}`}>DP Matrix Explorer</button>
            </div>
          </div>
          {viewMode === "logs" ? (
            <div className="flex-grow overflow-y-auto terminal-scroll">
              {logs.map((l, i) => <div key={i} className={`mb-1 ${l.type === "success" ? "text-green-400" : l.type === "highlight" ? "text-sky-400 font-bold" : "text-slate-400"}`}> {'>'} {l.text}</div>)}
            </div>
          ) : (
            <div className="flex-grow overflow-auto p-2">
              <h3 className="text-sky-400 font-bold mb-3 uppercase tracking-widest text-xs">Material Inventory (Problem Inputs)</h3>
              
              {/* Material Inventory Header: Always visible for the professor to see the input data */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {PACKAGES.map((item, i) => (
                  <div key={i} className="bg-slate-800/50 p-2 border border-slate-700 rounded shadow-sm">
                    <div className="font-bold text-sky-300 truncate text-[10px]">{item.name}</div>
                    <div className="text-slate-500 text-[10px]">{item.weight}kg | ${item.value}</div>
                  </div>
                ))}
              </div>

              <h3 className="text-sky-400 font-bold mb-3 uppercase tracking-widest text-xs">DP Matrix (Memoization Table)</h3>
              <table className="w-full border-collapse text-[10px] text-slate-400">
                <thead>
                  <tr className="bg-slate-800">
                    <td className="border border-slate-700 p-1">i\w</td>
                    {matrix[0]?.map((_, w) => <td key={w} className="border border-slate-700 p-1 text-center w-6">{w}</td>)}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 p-1 bg-slate-800 font-bold">{i}</td>
                      {row.map((val, w) => <td key={w} className={`border border-slate-700 p-1 text-center ${val > 0 ? "text-sky-100" : "text-slate-700"}`}>{val}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
