#ifndef ARCHITECT_H
#define ARCHITECT_H

#include <vector>
#include <string>
#include <unordered_map>
#include "json.hpp" // JSON library for structured API communication

using json = nlohmann::json;

/**
 * [STRUCT] Edge
 * Represents a road connection between two logistics hubs.
 * - Used as the fundamental building block for the Kruskal's MST algorithm.
 * - implements Operator Overloading for sorting (Greedy paradigm requirement).
 */
struct Edge {
    int src, dest, weight;
    // FORMULA: Comparison operator allows sort() to arrange edges by non-decreasing weight.
    bool operator<(const Edge& other) const {
        return weight < other.weight;
    }
};

/**
 * [CLASS] CityGraph
 * The central Logistics Engine that manages the city's infrastructure.
 * Architecture: Separates Algorithm logic from the HTTP server routing.
 */
class CityGraph {
private:
    int V; // V = Vertices (Logistics Hubs)
    
    // DATA STRUCTURE 2 (Partial): Edge List for Kruskal's MST
    std::vector<Edge> edges; 
    
    // DATA STRUCTURE 1: Adjacency List
    // - Format: vector<[Target_Hub, Distance]>
    // - Chosen for efficient Dijkstra expansion (exploring neighbors of the current node).
    std::vector<std::vector<std::pair<int, int>>> adjList; 
    
    // DATA STRUCTURE 5: Hash Map (O(1) complexity)
    // - Maps numeric Hub IDs to semantic Warehouse Names.
    // - Demonstrates constant time attribute retrieval.
    std::unordered_map<int, std::string> hubNames; 

public:
    CityGraph(int vertices);
    void addEdge(int u, int v, int cost);

    // UTILITIES: Graph population and visualization data
    void generateRandomEdges(int extraEdges = 0);
    json getGraphData();
    std::string getHubName(int id);

    /**
     * [ALGORITHM 1] Kruskal's Minimum Spanning Tree
     * Paradigm: GREEDY
     * Goal: Connect all hubs using the minimum possible road length.
     */
    json runKruskal(); 
    
    /**
     * [ALGORITHM 2] Dijkstra's Shortest Path
     * Paradigm: GREEDY
     * Goal: Find the most efficient delivery route between two hubs.
     */
    json runDijkstra(int start, int end);
};

#endif // ARCHITECT_H
