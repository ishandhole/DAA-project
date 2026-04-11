#include "Architect.hpp"
#include <algorithm>
#include <queue>
#include <climits>
#include <cstdlib>
#include <ctime>
#include <iostream>

using namespace std;

// ANSI Terminal Colors for the UI
#define RESET   "\033[0m"
#define RED     "\033[31m"
#define GREEN   "\033[32m"
#define YELLOW  "\033[33m"
#define BLUE    "\033[34m"
#define MAGENTA "\033[35m"
#define CYAN    "\033[36m"
#define BOLD    "\033[1m"

// ----------------------------------------------------------------------------------
// DATA STRUCTURE 2: Disjoint Set Union (DSU)
// Paradigm: Disjoint Sets / Union-Find
// Role in Project: Cycle Detection for Kruskal's MST algorithm.
// ----------------------------------------------------------------------------------
struct DSU {
    vector<int> parent, rank;
    
    // FORMULA: Initialization makes every Hub its own representative.
    // Complexity: O(V)
    DSU(int n) {
        parent.resize(n);
        rank.resize(n, 0);
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    // FORMULA: Find Operation with PATH COMPRESSION.
    // Logic: Recursively follows parent pointers until the root is found.
    // Optimization: parent[i] = find(parent[i]) ensures subsequent lookups are O(alpha(V)) ~ O(1).
    int find(int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent[i]); 
    }
    
    // FORMULA: Union Operation by RANK.
    // Logic: Attaches the smaller set under the root of the larger set to keep the tree flat.
    // Complexity: O(alpha(V)) which is nearly constant.
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

CityGraph::CityGraph(int vertices) : V(vertices) {
    adjList.resize(V);
    
    // Using a Hash Map (Data Structure 5) to store semantic warehouse names
    vector<string> possibleNames = {
        "Central Warehouse", "Silicon Valley Depot", "Marina Harbor", 
        "Echo Ridge Station", "Sunset Terminal", "Tech Plaza", 
        "Green Valley Hub", "Skyline Port", "Blue Creek Logistics", 
        "Grand Avenue Depot", "South Gate", "North Point"
    };
    
    for (int i = 0; i < V; i++) {
        hubNames[i] = (i < (int)possibleNames.size()) ? possibleNames[i] : "Generic Hub " + to_string(i);
    }
}

string CityGraph::getHubName(int id) {
    if (hubNames.count(id)) return hubNames[id];
    return "Unknown Hub";
}

void CityGraph::addEdge(int u, int v, int cost) {
    edges.push_back({u, v, cost});
    adjList[u].push_back({v, cost});
    adjList[v].push_back({u, cost});
}

void CityGraph::generateRandomEdges(int extraEdges) {
    srand(time(NULL));
    for (int i = 1; i < V; i++) {
        addEdge(i, rand() % i, (rand() % 10) + 1);
    }
    for (int i = 0; i < extraEdges; i++) {
        int u = rand() % V, v = rand() % V;
        if (u != v) addEdge(u, v, (rand() % 10) + 1);
    }
}

json CityGraph::getGraphData() {
    json result;
    json nodesArr = json::array();
    for (int i = 0; i < V; i++) nodesArr.push_back({{"id", i}, {"label", hubNames[i]}});
    json edgesArr = json::array();
    int counter = 0;
    for (const auto& e : edges) {
        edgesArr.push_back({{"from", e.src}, {"to", e.dest}, {"label", to_string(e.weight)}, {"id", "e" + to_string(counter++)}});
    }
    result["nodes"] = nodesArr;
    result["edges"] = edgesArr;
    return result;
}

// ----------------------------------------------------------------------------------
// ALGORITHM 1: Kruskal's Minimum Spanning Tree (MST)
// PARADIGM: GREEDY
// Logic: Sort all roads by price and pick the cheapest ones that don't cause a loop.
// Complexity: O(E log E) or O(E log V)
// ----------------------------------------------------------------------------------
json CityGraph::runKruskal() {
    cout << endl << BOLD << CYAN << "[KRUSKAL'S DASHBOARD]" << RESET << endl;
    
    // STEP 1: GREEDY CHOICE - Sort all edges in non-decreasing order of weight.
    vector<Edge> sortedEdges = edges;
    sort(sortedEdges.begin(), sortedEdges.end());

    // STEP 2: USE DSU for Cycle Detection.
    DSU dsu(V);
    int totalCost = 0;
    json mstEdges = json::array();
    int edgesFound = 0;

    for (const auto& edge : sortedEdges) {
        if (edgesFound >= V-1) break; // MST must have exactly V-1 edges.

        // FORMULA: Cycle Detection using DSU.Find()
        // If find(u) == find(v), they are already connected; adding this edge creates a cycle.
        if (dsu.find(edge.src) != dsu.find(edge.dest)) {
            cout << "[BUILT] " << getHubName(edge.src) << " <-> " << getHubName(edge.dest) << endl;
            dsu.unite(edge.src, edge.dest);
            totalCost += edge.weight;
            mstEdges.push_back({{"src", edge.src}, {"dest", edge.dest}, {"weight", edge.weight}, {"srcName", hubNames[edge.src]}, {"destName", hubNames[edge.dest]}});
            edgesFound++;
        }
    }

    json result;
    result["status"] = "success";
    result["totalCost"] = totalCost;
    result["edges"] = mstEdges;
    return result;
}

// ----------------------------------------------------------------------------------
// ALGORITHM 2: Dijkstra's Shortest Path
// PARADIGM: GREEDY
// Logic: Always explore the hub with the smallest "tentative" distance.
// Complexity: O((V+E) log V) with Priority Queue.
// ----------------------------------------------------------------------------------
json CityGraph::runDijkstra(int start, int end) {
    cout << endl << BOLD << YELLOW << "[DIJKSTRA'S NAVIGATION]" << RESET << endl;

    // DATA STRUCTURE 3: Min-Heap (Priority Queue)
    // Used to greedily pick the hub with the smallest distance.
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;

    vector<int> dist(V, INT_MAX); // Records shortest distance to each hub.
    vector<int> parent(V, -1);    // Records the path for reconstruction.

    dist[start] = 0;
    pq.push({0, start});

    while (!pq.empty()) {
        int u = pq.top().second;
        int d = pq.top().first;
        pq.pop();

        if (d > dist[u]) continue; // Optimization: Skip stale values in PQ.
        if (u == end) break; 

        for (const auto& neighbor : adjList[u]) {
            int v = neighbor.first;
            int weight = neighbor.second;

            // FORMULA: EDGE RELAXATION
            // If going through 'u' to 'v' is shorter than the current distance to 'v', update it.
            // dist[v] = min(dist[v], dist[u] + weight)
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    // PATH RECONSTRUCTION: Trace back from target to source using the 'parent' pointers.
    vector<int> path;
    for (int v = end; v != -1; v = parent[v]) path.push_back(v);
    reverse(path.begin(), path.end());

    json result;
    result["status"] = "success";
    result["cost"] = dist[end];
    result["path"] = path;
    return result;
}
