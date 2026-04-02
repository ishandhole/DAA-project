#include "httplib.h"
#include "json.hpp"
#include "Architect.hpp"
#include <iostream>
#include <vector>
#include <memory>
#include <string>
#include <algorithm>

using namespace std;
using json = nlohmann::json;

// Global Graph State
unique_ptr<CityGraph> activeGraph = nullptr;

// ----------------------------------------------------------------------------------
// ROUTING DEFINITIONS (The "Bridge" between Algorithms and the UI)
// ----------------------------------------------------------------------------------
void setupRoutes(httplib::Server& svr) {
    
    // [ENDPOINT] Generate Map: Creates the "Problem Input" for the algorithms to solve.
    svr.Get("/api/generateMap", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        int hubs = 8;
        if (req.has_param("hubs")) hubs = stoi(req.get_param_value("hubs"));
        if (hubs < 2 || hubs > 50) hubs = 8; // Safety bounds
        
        // Initialize a new Graph structure in memory
        activeGraph = make_unique<CityGraph>(hubs);
        // Step 1: Use Random Edge Generation to simulate unpaved terrain
        activeGraph->generateRandomEdges(hubs * 2); 
        
        // Step 2: Return JSON so the UI knows where the hubs are
        json result = activeGraph->getGraphData();
        res.set_content(result.dump(), "application/json");
    });

    // [ALGORITHM 1] Kruskal's MST (Paradigm: GREEDY)
    // Complexity: O(E log E) - Sorting the edges dominates the time.
    // Use Case: Paving roads with the absolute minimum budget while avoiding wasteful cycles.
    svr.Get("/api/kruskal", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        if (!activeGraph) {
            res.set_content(json{{"status", "error"}, {"message", "Map not generated"}}.dump(), "application/json");
            return;
        }
        // Calls the architectural logic to solve the Minimum Spanning Tree
        json result = activeGraph->runKruskal();
        res.set_content(result.dump(), "application/json");
    });

    // [ALGORITHM 2] Dijkstra's Shortest Path (Paradigm: GREEDY)
    // Complexity: O(E log V) using a Priority Queue (Min-Heap).
    // Use Case: Finding the fastest direct delivery route for one truck.
    svr.Get("/api/dijkstra", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        if (!activeGraph) {
            res.set_content(json{{"status", "error"}, {"message", "Map not generated"}}.dump(), "application/json");
            return;
        }

        int start = 0;
        int end = 4;
        if (req.has_param("start")) start = stoi(req.get_param_value("start"));
        if (req.has_param("end")) end = stoi(req.get_param_value("end"));

        json result = activeGraph->runDijkstra(start, end);
        res.set_content(result.dump(), "application/json");
    });

    // [ALGORITHM 3] 0/1 Knapsack (Paradigm: DYNAMIC PROGRAMMING)
    // Complexity: O(N * W) where N is items and W is capacity.
    // Use Case: Filling a delivery van with the most valuable packages without exceeding weight limits.
    svr.Get("/api/knapsack", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        int weightLimit = 20;
        if (req.has_param("limit")) weightLimit = stoi(req.get_param_value("limit"));

        // Step 1: Input Data - Packages with Weight vs Value (Profit)
        struct Package { string id; int weight; int value; };
        vector<Package> packages = {
            {"Medical Supplies", 5, 50},
            {"Electronics", 8, 80},
            {"Office Chairs", 12, 60},
            {"Luxury Goods", 3, 100},
            {"Food Rations", 7, 40}
        };

        int n = packages.size();
        // Data Structure: 2D Matrix for "Memoization" (The core of DP)
        vector<vector<int>> dp(n + 1, vector<int>(weightLimit + 1, 0));

        // Step 2: Build the DP Table (Bottom-Up Approach)
        for (int i = 1; i <= n; i++) {
            for (int w = 1; w <= weightLimit; w++) {
                // If package fits, decide: include it or leave it?
                if (packages[i - 1].weight <= w) {
                    // Logic: max( Don't Include , Include and take remaining weight solution )
                    dp[i][w] = max(dp[i - 1][w], packages[i - 1].value + dp[i - 1][w - packages[i - 1].weight]);
                } else {
                    // Package too heavy; must copy the previous best for this weight
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }

        // Step 3: Traceback - Read the DP table backwards to find which packages were chosen
        int maxProfit = dp[n][weightLimit];
        int w = weightLimit;
        json selectedPackages = json::array();

        for (int i = n; i > 0 && maxProfit > 0; i--) {
            // If value changed, it means the current package was definitely included
            if (maxProfit != dp[i - 1][w]) { 
                selectedPackages.push_back({
                    {"name", packages[i - 1].id},
                    {"weight", packages[i - 1].weight},
                    {"value", packages[i - 1].value}
                });
                maxProfit -= packages[i - 1].value;
                w -= packages[i - 1].weight;
            }
        }

        json allPackages = json::array();
        for (const auto& p : packages) {
            allPackages.push_back({{"name", p.id}, {"weight", p.weight}, {"value", p.value}});
        }

        // Complete the table and traceback logic as before...
        // ... but also return the 2D matrix for the professor's visual benefit!
        
        json result;
        result["status"] = "success";
        result["inventory"] = allPackages;
        result["matrix"] = dp; // nlohmann/json automatically handles 2D vector<vector<int>> !
        result["maxRevenue"] = dp[n][weightLimit];
        result["loaded"] = selectedPackages;
        res.set_content(result.dump(), "application/json");
    });
}

int main() {
    // Generate initial default graph so UI doesn't break on startup
    activeGraph = make_unique<CityGraph>(8);
    activeGraph->generateRandomEdges(16);

    httplib::Server svr;

    // Headless API Mode: We no longer serve static files, heavily empowering the decoupled Next.js stack!
    svr.Options(R"(.*)", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    });


    setupRoutes(svr);

    cout << "Starting CityFlow Server on http://localhost:8080..." << endl;
    
    // Listen on port 8080
    svr.listen("0.0.0.0", 8080);
    
    return 0;
}
