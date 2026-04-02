#!/bin/bash

# Kill any existing processes on ports 8080 and 3000
echo "Cleaning up ports 8080 and 3000..."
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "======================================"
echo "    CityFlow 2.0 - Master Launcher"
echo "======================================"

# 1. Start C++ Backend
echo "🔨 Compiling C++ Backend..."
g++ -std=c++17 src/CityFlow_Main.cpp src/Architect.cpp -o CityFlow2_API

if [ $? -eq 0 ]; then
    echo "✅ Backend Compiled Successfully!"
    echo "🚀 Starting C++ API on http://localhost:8080..."
    ./CityFlow2_API & # Run in background
else
    echo "❌ C++ Compilation Failed!"
    exit 1
fi

# 2. Start Next.js Frontend
echo "📦 Starting Next.js Frontend on http://localhost:3000..."
cd frontend
npm run dev
