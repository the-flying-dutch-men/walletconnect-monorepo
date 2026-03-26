#!/bin/bash

echo "=== Setting up WC-WE Test Environment ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build the monorepo packages
echo -e "${BLUE}Step 1: Building monorepo packages...${NC}"
cd packages/types
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build types package${NC}"
    exit 1
fi
cd ../utils
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build utils package${NC}"
    exit 1
fi
cd ../..
echo -e "${GREEN}✓ Packages built successfully${NC}"
echo ""

# Step 2: Setup wallet environment
echo -e "${BLUE}Step 2: Setting up wallet environment...${NC}"
cd web-examples/advanced/wallets/react-wallet-v2

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local not found!${NC}"
    echo "Please create .env.local with:"
    echo "NEXT_PUBLIC_PROJECT_ID=your_project_id"
    echo "NEXT_PUBLIC_RELAY_URL=wss://relay.walletconnect.com"
    exit 1
fi

echo -e "${GREEN}✓ Environment file exists${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Start wallet
echo -e "${BLUE}Step 4: Starting wallet on http://localhost:3001...${NC}"
echo ""
echo -e "${GREEN}Setup complete! Starting wallet...${NC}"
echo ""
echo "Open http://localhost:3001 in your browser"
echo ""
npm run dev
