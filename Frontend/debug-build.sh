#!/bin/bash

echo "=== FrutyTrack Frontend Build Debug Script ==="
echo "Checking Node.js and npm versions..."
node --version
npm --version

echo -e "\nChecking package.json..."
if [ -f "package.json" ]; then
    echo "package.json found"
else
    echo "ERROR: package.json not found"
    exit 1
fi

echo -e "\nInstalling dependencies..."
npm ci

echo -e "\nChecking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo "tsconfig.json found"
    npx tsc --noEmit --project tsconfig.json || echo "TypeScript check failed"
else
    echo "tsconfig.json not found"
fi

echo -e "\nChecking React Scripts..."
npm run build --verbose

echo -e "\nBuild completed!"
