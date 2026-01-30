#!/bin/bash
# =============================================================================
# Local Development Setup Script for Linux
# =============================================================================

set -e  # Exit on error

echo "🚀 Setting up S3 File Portal for local development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}📦 Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "${RED}❌ Python is not installed. Please install Python 3.10+${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Found Python $PYTHON_VERSION${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${BLUE}📦 Creating virtual environment...${NC}"
    $PYTHON_CMD -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}🔄 Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${BLUE}📦 Upgrading pip...${NC}"
pip install --upgrade pip -q

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pip install -r requirements.txt -q
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please update with your values if needed.${NC}"
fi

# Load environment variables
echo -e "${BLUE}🔧 Loading environment variables...${NC}"
export $(grep -v '^#' .env | xargs)

# Show configuration
echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}📋 Configuration:${NC}"
echo -e "   DATABASE_URL: ${DATABASE_URL:-sqlite:///./test.db}"
echo -e "   S3_BUCKET_NAME: ${S3_BUCKET_NAME:-not set}"
echo -e "   AWS_REGION: ${AWS_REGION:-ap-south-1}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Run the server
echo -e "${GREEN}🚀 Starting FastAPI server...${NC}"
echo -e "${YELLOW}📖 API Docs: http://localhost:8000/docs${NC}"
echo -e "${YELLOW}📖 Frontend: Open frontend/index.html in browser${NC}"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
