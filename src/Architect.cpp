#include "Architect.hpp"
#include <algorithm>
#include <queue>
#include <climits>
#include <cstdlib>
#include <ctime>

using namespace std;

// -------------------------------------------------------------
// DATA STRUCTURE: Disjoint Set Union (DSU)
// Paradigm: This is the fundamental "Cycle Detector" for Kruskal's.
// It manages Hubs as non-overlapping sets.
// -------------------------------------------------------------
struct DSU {
    vector<int> parent, rank;
    
    // INITIALIZATION: Every Hub is its own parent (disjoint)
    DSU(int n) {
        parent.resize(n);
        rank.resize(n, 0);
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    // FIND: Locates the ultimate "Representative" of a set.
    // OPTIMIZATION: Uses Path Compression (Updating child to point directly to root).
    int find(int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent[i]); 
    }
    
    // UNITE: Merges two separate sets of Hubs into one.
    // OPTIMIZATION: Union by Rank (Attaching the smaller tree under the taller tree).
    void unite(int i, int j) {
        int root_i = find(i);
        int root_j = find(j);
        if (root_i != root_j) {
            if (rank[root_i] < rank[root_j])
                parent[root_i] = root_j;
            else if (rank[root_i] > rank[root_j])
                parent[root_j] = root_i;
            else {
                parent[root_j] = root_i;
                rank[root_i]++;
            }
        }
    }
};

// Initialize the city graph with V hubs
CityGraph::CityGraph(int vertices) : V(vertices) {
    adjList.resize(V);
}

void CityGraph::addEdge(int u, int v, int cost) {
    edges.push_back({u, v, cost});
    adjList[u].push_back({v, cost});
    adjList[v].push_back({u, cost});
}

void CityGraph::generateRandomEdges(int extraEdges) {
    srand(time(NULL));
    // Step 1: Create a connected spanning tree so no isolated nodes exist
    for (int i = 1; i < V; i++) {
        int u = i;
        int v = rand() % i; // Connect to a previously added node
        int cost = (rand() % 10) + 1; // 1 to 10
        addEdge(u, v, cost);
    }
    // Step 2: Add extra random edges for alternative routes
    for (int i = 0; i < extraEdges; i++) {
        int u = rand() % V;
        int v = rand() % V;
        if (u != v) {
            int cost = (rand() % 10) + 1;
            addEdge(u, v, cost);
        }
    }
}

json CityGraph::getGraphData() {
    json result;
    json nodesArr = json::array();
    for (int i = 0; i < V; i++) {
        nodesArr.push_back({{"id", i}, {"label", "Hub " + to_string(i)}});
    }
    json edgesArr = json::array();
    int edgeCounter = 0;
    for (const auto& e : edges) {
        edgesArr.push_back({
            {"from", e.src},
            {"to", e.dest},
            {"label", to_string(e.weight)},
            {"id", "e" + to_string(edgeCounter++)}
        });
    }
    result["nodes"] = nodesArr;
    result["edges"] = edgesArr;
    return result;
}

// --- ALGORITHM 1: KRUSKAL'S MINIMUM SPANNING TREE ---
// PARADIGM: GREEDY
// Time Complexity: O(E log E) because of sorting
// Space Complexity: O(V) for the DSU parent array
// Purpose: Finds the absolute cheapest way to connect ALL delivery hubs without redundant loops.
json CityGraph::runKruskal() {
    json result;
    
    // STEP 1: Sort all possible roads (Edges) by cost (Weight).
    // GREEDY CHOICE: Always prioritize the cheapest possible road.
    vector<Edge> sortedEdges = edges;
    sort(sortedEdges.begin(), sortedEdges.end());

    // STEP 2: Use DSU for "Feasibility Check."
    DSU dsu(V);
    int totalCost = 0;
    json mstEdges = json::array();

    for (const auto& edge : sortedEdges) {
        // Feasibility check: Will adding this road create a redundant loop?
        if (dsu.find(edge.src) != dsu.find(edge.dest)) {
            dsu.unite(edge.src, edge.dest); // Formally build the road
            totalCost += edge.weight;
            mstEdges.push_back({
                {"src", edge.src},
                {"dest", edge.dest},
                {"weight", edge.weight}
            });
        }
    }

    result["status"] = "success";
    result["totalCost"] = totalCost;
    result["edges"] = mstEdges;
    return result;
}

// --- ALGORITHM 2: DIJKSTRA'S SHORTEST PATH ---
// PARADIGM: GREEDY
// Time Complexity: O(E log V) using a Priority Queue (Min-Heap)
// Space Complexity: O(V) for the distance array
// Purpose: Calculates the absolute fastest delivery path from a specific Start Hub to a specific Target.
json CityGraph::runDijkstra(int start, int end) {
    json result;
    
    if (start < 0 || start >= V || end < 0 || end >= V) {
        result["status"] = "error";
        result["message"] = "Invalid Hub ID";
        return result;
    }

    // DATA STRUCTURE: Distance array to keep track of the "Best Known So Far"
    vector<int> dist(V, INT_MAX); 
    vector<int> parent(V, -1);    
    
    // DATA STRUCTURE: Min-Heap Priority Queue.
    // GREEDY CHOICE: Always expand the closest unvisited node from the heap.
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;

    dist[start] = 0;
    pq.push({0, start});

    while (!pq.empty()) {
        int u = pq.top().second; // Get the closest hub
        int d = pq.top().first;
        pq.pop();

        if (d > dist[u]) continue; // Optimization: Already found a better way to 'u'
        if (u == end) break; 

        for (const auto& neighbor : adjList[u]) {
            int v = neighbor.first;
            int weight = neighbor.second;

            // EDGE RELAXATION: If traveling via 'u' makes 'v' easier to reach, update 'v'.
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    if (dist[end] == INT_MAX) {
        result["status"] = "error";
        result["message"] = "No connected path between these hubs.";
        return result;
    }

    // TRACEBACK: Reconstruct path by walking backwards through parents.
    vector<int> path;
    for (int v = end; v != -1; v = parent[v]) {
        path.push_back(v);
    }
    reverse(path.begin(), path.end()); 

    result["status"] = "success";
    result["cost"] = dist[end];
    result["path"] = path;
    return result;
}
