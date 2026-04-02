"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, Box, RefreshCw, Cpu, CheckCircle } from "lucide-react";

const API_BASE = "/api";

type LogType = { text: string; type: "normal" | "success" | "highlight" | "error" };

export default function CityFlowDashboard() {
  // ----------------------------------------------------------------------------------
  // STATE MANAGEMENT: Reactive variables that trigger UI updates when changed.
  // ----------------------------------------------------------------------------------
  const [hubs, setHubs] = useState<number>(8);
  const [startHub, setStartHub] = useState<number>(0);
  const [endHub, setEndHub] = useState<number>(4);
  const [knapsackLimit, setKnapsackLimit] = useState<number>(20);
  const [logs, setLogs] = useState<LogType[]>([]);
  
  // NEW STORAGE: These hold the DP matrix and items for the professor's visual.
  const [inventory, setInventory] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [viewMode, setViewMode] = useState<"logs" | "matrix">("logs");
  
  // REFS: These allow us to hold direct pointers to the HTML Canvas and the Vis objects
  // without triggering a re-render of the entire React component.
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<any>(null);
  const nodesDataSet = useRef<any>(null);
  const edgesDataSet = useRef<any>(null);

  // Helper: Adds a colored message to the onscreen console log
  const addLog = (text: string, type: LogType["type"] = "normal") => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  // Helper: Dramatic pause for algorithmic animations (Kruskal/Dijkstra)
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ----------------------------------------------------------------------------------
  // COMPONENT LIFECYCLE: This runs once when the browser loads the dashboard.
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    // We use a dynamic import because 'vis-network' requires the 'window' object,
    // which only exists on the client (browser), not during Next.js server-side rendering.
    const loadVis = async () => {
      // @ts-ignore
      const { Network } = await import("vis-network");
      // @ts-ignore
      const { DataSet } = await import("vis-data");
      
      // Initialize the DataSets (The raw data behind the graph)
      nodesDataSet.current = new DataSet();
      edgesDataSet.current = new DataSet();

      if (networkRef.current) {
        // Tie the DataSets to the HTML visualizer
        const data = { nodes: nodesDataSet.current, edges: edgesDataSet.current };
        const options = {
          nodes: {
            shape: "dot",
            size: 16,
            font: { size: 14, color: "#fff" },
            color: { background: "#38bdf8", border: "#1e293b", highlight: "#facc15" },
          },
          edges: {
            width: 2,
            color: { color: "rgba(255, 255, 255, 0.4)", highlight: "#facc15" },
            font: { size: 12, align: "top", color: "#94a3b8" },
          },
          physics: { enabled: true, barnesHut: { springLength: 150 } },
        };
        // Formally create the network diagram on the canvas
        networkInstance.current = new Network(networkRef.current, data, options);
      }
      
      addLog("Welcome to CityFlow 2.0 (Next.js Edition)!", "success");
      handleGenerateMap(); // Auto-generation on boot
    };

    loadVis();

    // Cleanup function: Destroys the graph if the user leaves the page
    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
      }
    };
  }, []);

  // ----------------------------------------------------------------------------------
  // INTEGRATION: Communication with the C++ Backend API (Port 8080)
  // ----------------------------------------------------------------------------------
  const handleGenerateMap = async () => {
    addLog(`[SYSTEM] Generating urban grid with ${hubs} Hubs...`);
    try {
      // Fetch request sends the 'hubs' count to C++
      const res = await fetch(`${API_BASE}/generateMap?hubs=${hubs}`);
      const data = await res.json();
      
      // Update the visual graph with the new random nodes and edges
      nodesDataSet.current.clear();
      edgesDataSet.current.clear();
      nodesDataSet.current.add(data.nodes);
      edgesDataSet.current.add(data.edges);
      
      addLog("Random City Map Generated Successfully.", "success");
    } catch (err) {
      addLog("API Error. Ensure the Next.js API routes are working.", "error");
    }
  };

  const handleKruskal = async () => {
    addLog("[ALGORITHM] Building Infrastructure (Kruskal's MST)...", "highlight");
    try {
      const res = await fetch(`${API_BASE}/kruskal`, {
        method: "POST",
        body: JSON.stringify({ edges: edgesDataSet.current.get(), hubs })
      });
      const data = await res.json();

      let currentEdges = edgesDataSet.current.get();
      currentEdges.forEach((e: any) => { edgesDataSet.current.update({ id: e.id, color: "rgba(255, 255, 255, 0.1)" }); });

      addLog(`Total Infrastructure Cost: $${data.totalCost} Mil`, "success");
      
      // Animate edge building
      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i];
        const match = currentEdges.find((e: any) => e.from === edge.src && e.to === edge.dest);
        if (match) {
          edgesDataSet.current.update({ id: match.id, color: "#38bdf8", width: 4 });
          addLog(`[BUILT] Hub ${edge.src} <==> Hub ${edge.dest} | Cost: ${edge.weight}`);
          await sleep(200);
        }
      }
    } catch (err) {
      addLog("API Error executing Kruskal's.", "error");
    }
  };

  const handleDijkstra = async () => {
    addLog(`[ALGORITHM] GPS Navigation (Dijkstra) | Hub ${startHub} -> Hub ${endHub}`, "highlight");
    try {
      const res = await fetch(`${API_BASE}/dijkstra`, {
        method: "POST",
        body: JSON.stringify({ 
          nodes: nodesDataSet.current.get(), 
          edges: edgesDataSet.current.get(), 
          start: startHub, 
          end: endHub 
        })
      });
      const data = await res.json();

      if (data.status === "error") {
        addLog(`Error: ${data.message}`, "error");
        return;
      }

      addLog(`Fastest Route Found! Dist: ${data.cost} KM`, "success");
      
      // Animate path node-by-node
      for (let i = 0; i < data.path.length; i++) {
        nodesDataSet.current.update({ id: data.path[i], color: { background: "#22c55e", border: "#166534" } });
        addLog(`[PATH] Reached Hub ${data.path[i]}`);
        
        if (i > 0) {
          const prev = data.path[i-1];
          const curr = data.path[i];
          const edgesList = edgesDataSet.current.get();
          const routeEdge = edgesList.find((e: any) => (e.from === prev && e.to === curr) || (e.from === curr && e.to === prev));
          if (routeEdge) edgesDataSet.current.update({ id: routeEdge.id, color: "#22c55e", width: 5 });
        }
        await sleep(400);
      }

      // Final Path Summary (Arrow Format)
      addLog(`Final Route Sequence: ${data.path.join(" -> ")}`, "success");
    } catch (err) {
      addLog("API Error executing Dijkstra's.", "error");
    }
  };

  const handleKnapsack = async () => {
    addLog(`[ALGORITHM] Load Optimizer (0/1 Knapsack) | Van Limit: ${knapsackLimit}KG`, "highlight");
    try {
      const res = await fetch(`${API_BASE}/knapsack`, {
        method: "POST",
        body: JSON.stringify({ limit: knapsackLimit })
      });
      const data = await res.json();

      if (data.status === "error") {
        addLog("Error executing Knapsack.", "error");
        return;
      }

      // PROFESSOR INSIGHT: We now save the entire materials list and DP matrix for viewing
      setInventory(data.inventory);
      setMatrix(data.matrix);

      addLog("> Analyzing Dynamic Programming Matrix...", "highlight");
      await sleep(600); // Dramatic pause
      addLog(`[SUCCESS] Max Revenue Generated: $${data.maxRevenue}`, "success");
      
      for (let i = 0; i < data.loaded.length; i++) {
        const pkg = data.loaded[i];
        addLog(`[LOADED into VAN] ${pkg.name} | Wt: ${pkg.weight}kg | Val: $${pkg.value}`);
        await sleep(300);
      }
      
      // Auto-switch to matrix view for the reveal
      setViewMode("matrix");

    } catch (err) {
      addLog("API Error executing Knapsack.", "error");
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 p-4 gap-4 font-sans">
      {/* Sidebar Controls */}
      <div className="w-1/4 h-full glass-panel rounded-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
          CityFlow 2.0 Engine
        </h1>
        
        {/* Core Controls */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-sm text-slate-400 mb-2 block">1. City Grid Dimension (Hubs)</label>
            <div className="flex gap-2">
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={hubs} onChange={e => setHubs(parseInt(e.target.value) || 0)} />
              <button onClick={handleGenerateMap} className="bg-slate-700 hover:bg-slate-600 p-2 rounded transition"><RefreshCw size={20}/></button>
            </div>
          </div>

          <button onClick={handleKruskal} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-between group">
            <span>Build Roads (Kruskal's MST)</span>
            <Cpu className="text-sky-300 group-hover:rotate-12 transition" />
          </button>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-sm text-slate-400 mb-2 block">2. Smart GPS (Dijkstra)</label>
            <div className="flex items-center gap-2 mb-3">
              <input type="number" placeholder="Start" className="w-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" value={startHub} onChange={e => setStartHub(parseInt(e.target.value) || 0)} />
              <span className="text-slate-500">→</span>
              <input type="number" placeholder="End" className="w-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" value={endHub} onChange={e => setEndHub(parseInt(e.target.value) || 0)} />
            </div>
            <button onClick={handleDijkstra} className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2">
              <Navigation size={18} /> Find Fastest Route
            </button>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <label className="text-sm text-slate-400 mb-2 block">3. Van Load Optimizer (Knapsack)</label>
            <div className="flex gap-2 mb-3">
              <input type="number" placeholder="Max Weight" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm" value={knapsackLimit} onChange={e => setKnapsackLimit(parseInt(e.target.value) || 0)} title="Van Weight Limit (KG)" />
            </div>
            <button onClick={handleKnapsack} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2">
              <Box size={18} /> Load Optimal Cargo
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="w-3/4 h-full flex flex-col gap-4">
        {/* Graph Visualizer Panel */}
        <div className="flex-grow glass-panel rounded-2xl relative overflow-hidden">
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
            <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> Live Map Simulation</h2>
          </div>
          <div ref={networkRef} className="w-full h-full bg-slate-950 absolute inset-0"></div>
        </div>

        {/* Terminal/Log Window or Matrix Explorer (Tabbed View) */}
        <div className="h-80 glass-panel rounded-2xl p-4 flex flex-col font-mono text-sm overflow-hidden">
          <div className="border-b border-slate-700 pb-2 mb-2 flex justify-between items-center">
            <div className="flex gap-4">
              <button onClick={() => setViewMode("logs")} className={`text-xs px-3 py-1 rounded transition ${viewMode === "logs" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>System Terminal</button>
              <button disabled={matrix.length === 0} onClick={() => setViewMode("matrix")} className={`text-xs px-3 py-1 rounded transition ${viewMode === "matrix" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
                DP Matrix Explorer {matrix.length === 0 && "(Run Knapsack first)"}
              </button>
            </div>
            <button onClick={() => setLogs([])} className="text-xs text-sky-400 hover:text-sky-300">Clear Logs</button>
          </div>
          
          {viewMode === "logs" ? (
            <div className="flex-grow overflow-y-auto terminal-scroll flex flex-col gap-1 pr-2">
              {logs.map((log, idx) => (
                <div key={idx} className={`
                  ${log.type === "normal" ? "text-slate-300" : ""}
                  ${log.type === "success" ? "text-green-400" : ""}
                  ${log.type === "highlight" ? "text-sky-400 font-bold" : ""}
                  ${log.type === "error" ? "text-red-400 font-bold" : ""}
                `}>
                  <span className="text-slate-600 mr-2">{'>'}</span>{log.text}
                </div>
              ))}
              <div ref={(el) => el?.scrollIntoView()} />
            </div>
          ) : (
            <div className="flex-grow overflow-auto p-2 scrollbar-hide">
              <h3 className="text-sky-400 text-xs font-bold mb-3 uppercase tracking-widest">Dynamic Programming Memoization Table</h3>
              
              {/* Material Inventory Header */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {inventory.map((item: any, i) => (
                  <div key={i} className="bg-slate-800/50 p-2 border border-slate-700 rounded text-[10px]">
                    <div className="font-bold text-sky-300 truncate">{item.name}</div>
                    <div className="text-slate-500">Wt: {item.weight} | Val: ${item.value}</div>
                  </div>
                ))}
              </div>

              {/* The Matrix */}
              <table className="w-full border-collapse text-[10px] text-slate-400">
                <thead>
                  <tr>
                    <th className="border border-slate-700 p-1 bg-slate-900 text-slate-500">i/w</th>
                    {Array.from({length: matrix[0].length}).map((_, w) => (
                      <th key={w} className="border border-slate-700 p-1 bg-slate-800/30 w-8">{w}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-700 p-1 bg-slate-900 font-bold text-sky-400 sticky left-0">{i}</td>
                      {row.map((val, w) => (
                        <td key={w} className={`border border-slate-700 p-1 text-center transition-colors ${val > 0 ? "text-sky-100" : "text-slate-700"} ${val === matrix[matrix.length-1][matrix[0].length-1] && val > 0 ? "bg-sky-500/20" : ""}`}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-[10px] text-slate-500 italic">
                * Highlighted cells represent optimal solutions for specific sub-problems.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
