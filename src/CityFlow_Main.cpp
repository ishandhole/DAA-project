#include "httplib.h"
#include "json.hpp"
#include "Architect.hpp"
#include <iostream>
#include <vector>
#include <memory>
#include <string>
#include <algorithm>
#include <unordered_map>

using namespace std;
using json = nlohmann::json;

// ----------------------------------------------------------------------------------
// GLOBAL STATE: The single source of truth for the City infrastructure.
// ----------------------------------------------------------------------------------
unique_ptr<CityGraph> activeGraph = nullptr;

/**
 * [ROUTING HUB]
 * This function defines the "Bridge" between the C++ Engine and the Web UI.
 * It maps URL endpoints to the specific DAA Algorithms.
 */
void setupRoutes(httplib::Server& svr) {
    
    // [UI TRIGGER] Generate Map
    svr.Get("/api/generateMap", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        int hubs = (req.has_param("hubs")) ? stoi(req.get_param_value("hubs")) : 8;
        activeGraph = make_unique<CityGraph>(hubs);
        activeGraph->generateRandomEdges(hubs * 2); 
        res.set_content(activeGraph->getGraphData().dump(), "application/json");
    });

    // [ALGORITHM 1 TRIGGER] Kruskal's MST
    svr.Get("/api/kruskal", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        if (!activeGraph) {
            json err;
            err["status"] = "error";
            err["message"] = "Graph not initialized. Generate a map first.";
            res.set_content(err.dump(), "application/json");
            return;
        }
        res.set_content(activeGraph->runKruskal().dump(), "application/json");
    });

    // [ALGORITHM 2 TRIGGER] Dijkstra's Shortest Path
    svr.Get("/api/dijkstra", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        if (!activeGraph) {
            json err;
            err["status"] = "error";
            err["message"] = "Graph not initialized.";
            res.set_content(err.dump(), "application/json");
            return;
        }
        
        if (!req.has_param("start") || !req.has_param("end")) {
            json err;
            err["status"] = "error";
            err["message"] = "Missing start or end hub ID.";
            res.set_content(err.dump(), "application/json");
            return;
        }

        try {
            int start = stoi(req.get_param_value("start"));
            int end = stoi(req.get_param_value("end"));
            res.set_content(activeGraph->runDijkstra(start, end).dump(), "application/json");
        } catch (...) {
            json err;
            err["status"] = "error";
            err["message"] = "Invalid Hub ID (numeric value required).";
            res.set_content(err.dump(), "application/json");
        }
    });

    // ------------------------------------------------------------------------------
    // [ALGORITHM 3] 0/1 KNAPSACK (Logistics Optimizer)
    // PARADIGM: DYNAMIC PROGRAMMING (DP)
    // Goal: Fill a delivery van with fixed capacity to maximize profit.
    // ------------------------------------------------------------------------------
    svr.Get("/api/knapsack", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        int weightLimit = 20;
        if (req.has_param("limit")) {
            try {
                weightLimit = stoi(req.get_param_value("limit"));
            } catch (...) {
                weightLimit = 20;
            }
        }

        // DATA STRUCTURE 5: Hash Map for inventory lookups
        unordered_map<string, pair<int, int>> catalog = {
            {"Medical Supplies", {5, 50}}, {"Electronics", {8, 80}},
            {"Office Chairs", {12, 60}}, {"Luxury Goods", {3, 100}}, {"Food Rations", {7, 40}}
        };

        struct Item { string name; int w; int v; };
        vector<Item> items;
        for (auto const& [name, stats] : catalog) items.push_back({name, stats.first, stats.second});

        int n = items.size();
        
        // DATA STRUCTURE 4: 2D Matrix for Memoization
        // Represents the maximum value for 'i' items with capacity 'w'.
        vector<vector<int>> dp(n + 1, vector<int>(weightLimit + 1, 0));

        // FORMULA: DP STATE TRANSITION
        // For each item, decide:
        // 1. Exclude: value = dp[i-1][w]
        // 2. Include: value = item.v + dp[i-1][w - item.w] (if space allows)
        // Result: dp[i][w] = max(exclude, include)
        for (int i = 1; i <= n; i++) {
            for (int w = 1; w <= weightLimit; w++) {
                if (items[i-1].w <= w) {
                    dp[i][w] = max(dp[i-1][w], items[i-1].v + dp[i-1][w - items[i-1].w]);
                } else {
                    dp[i][w] = dp[i-1][w];
                }
            }
        }

        // BACKTRACKING: Recovering the actual items that make up the "Max Revenue"
        // by looking at which decisions increased the value in the DP table.
        json loaded = json::array();
        int w = weightLimit;
        int maxVal = dp[n][weightLimit];
        for (int i = n; i > 0 && maxVal > 0; i--) {
            if (maxVal != dp[i-1][w]) {
                loaded.push_back({{"name", items[i-1].name}, {"weight", items[i-1].w}, {"value", items[i-1].v}});
                maxVal -= items[i-1].v;
                w -= items[i-1].w;
            }
        }

        json resObj;
        resObj["status"] = "success";
        resObj["matrix"] = dp;
        resObj["maxRevenue"] = dp[n][weightLimit];
        resObj["loaded"] = loaded;
        resObj["inventory"] = json::array();
        for (const auto& it : items) resObj["inventory"].push_back({{"name", it.name}, {"weight", it.w}, {"value", it.v}});
        res.set_content(resObj.dump(), "application/json");
    });
}

/**
 * [ENTRY POINT]
 * Starts the Logistics Engine and serves the API on Port 8080.
 */
int main() {
    httplib::Server svr;
    
    // ANSI Startup Banner for professional presentation
    cout << "\033[1;36m" << "==================================================" << endl;
    cout << "        CITYFLOW 2.0: LOGISTICS ENGINE         " << endl;
    cout << "==================================================" << "\033[0m" << endl;
    cout << "Architecture: C++ Core -> JSON API -> Next.js UI" << endl;
    cout << "Listening on: http://localhost:8080" << endl;

    setupRoutes(svr);
    svr.listen("0.0.0.0", 8080);
    return 0;
}
