#ifndef ARCHITECT_H
#define ARCHITECT_H

#include <vector>
#include <string>
#include "json.hpp" // For returning HTTP responses easily

using json = nlohmann::json;

struct Edge {
    int src, dest, weight;
    bool operator<(const Edge& other) const {
        return weight < other.weight;
    }
};

class CityGraph {
private:
    int V; // Number of hubs
    std::vector<Edge> edges; // For Kruskal
    std::vector<std::vector<std::pair<int, int>>> adjList; // For Dijkstra

public:
    CityGraph(int vertices);
    void addEdge(int u, int v, int cost);

    // Dynamic Graph Helpers
    void generateRandomEdges(int extraEdges = 0);
    json getGraphData();

    // Returns a JSON representing the MST (hubs and roads connected)
    json runKruskal(); 
    
    // Returns a JSON representing shortest path between start and end
    json runDijkstra(int start, int end);
};

#endif // ARCHITECT_H
