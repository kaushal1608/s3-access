#!/usr/bin/env python3
"""
Cross-platform local development runner for S3 File Portal.
Works on both Windows and Linux without requiring bash.

Usage:
    python run_local.py          # Start the server
    python run_local.py --setup  # Setup only (install deps, create .env)
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Colors for terminal output (works on most terminals)
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color
    
    @staticmethod
    def disable():
        Colors.RED = ''
        Colors.GREEN = ''
        Colors.YELLOW = ''
        Colors.BLUE = ''
        Colors.NC = ''

# Disable colors on Windows if not supported
if os.name == 'nt':
    try:
        os.system('color')  # Enable ANSI colors on Windows 10+
    except:
        Colors.disable()

def print_colored(color, message):
    print(f"{color}{message}{Colors.NC}")

def run_command(cmd, check=True):
    """Run a shell command and return the result."""
    print_colored(Colors.BLUE, f"  Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print_colored(Colors.RED, f"❌ Command failed: {result.stderr}")
        sys.exit(1)
    return result

def check_python():
    """Check Python version."""
    print_colored(Colors.BLUE, "📦 Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print_colored(Colors.RED, "❌ Python 3.9+ is required")
        sys.exit(1)
    print_colored(Colors.GREEN, f"✅ Found Python {version.major}.{version.minor}.{version.micro}")

def setup_venv():
    """Create virtual environment if it doesn't exist."""
    venv_path = Path("venv")
    
    if not venv_path.exists():
        print_colored(Colors.BLUE, "📦 Creating virtual environment...")
        run_command(f"{sys.executable} -m venv venv")
        print_colored(Colors.GREEN, "✅ Virtual environment created")
    else:
        print_colored(Colors.GREEN, "✅ Virtual environment already exists")
    
    return venv_path

def get_venv_python():
    """Get the path to the Python executable in the virtual environment."""
    if os.name == 'nt':
        return Path("venv/Scripts/python.exe")
    else:
        return Path("venv/bin/python")

def get_venv_pip():
    """Get the path to pip in the virtual environment."""
    if os.name == 'nt':
        return Path("venv/Scripts/pip.exe")
    else:
        return Path("venv/bin/pip")

def install_dependencies():
    """Install Python dependencies."""
    print_colored(Colors.BLUE, "📦 Installing dependencies...")
    pip_path = get_venv_pip()
    run_command(f"{pip_path} install --upgrade pip -q")
    run_command(f"{pip_path} install -r requirements.txt")
    print_colored(Colors.GREEN, "✅ Dependencies installed")

def setup_env_file():
    """Create .env file from .env.example if it doesn't exist."""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        print_colored(Colors.YELLOW, "📝 Creating .env file from .env.example...")
        shutil.copy(env_example, env_file)
        print_colored(Colors.GREEN, "✅ .env file created")
    elif env_file.exists():
        print_colored(Colors.GREEN, "✅ .env file already exists")

def load_env():
    """Load environment variables from .env file."""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

def run_server():
    """Run the FastAPI development server."""
    print_colored(Colors.GREEN, "\n🚀 Starting FastAPI server...")
    print_colored(Colors.YELLOW, "📖 API Docs: http://localhost:8000/docs")
    print_colored(Colors.YELLOW, "📖 Frontend: Open frontend/index.html in browser")
    print_colored(Colors.YELLOW, "📖 Press Ctrl+C to stop\n")
    
    python_path = get_venv_python()
    
    # Run uvicorn
    try:
        subprocess.run(
            [str(python_path), "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            check=True
        )
    except KeyboardInterrupt:
        print_colored(Colors.YELLOW, "\n\n👋 Server stopped")

def main():
    print_colored(Colors.BLUE, """
╔═══════════════════════════════════════════════════════════════╗
║          🚀 S3 File Portal - Local Development Setup          ║
╚═══════════════════════════════════════════════════════════════╝
""")
    
    # Change to script directory
    os.chdir(Path(__file__).parent)
    
    # Check arguments
    setup_only = '--setup' in sys.argv
    
    # Run setup steps
    check_python()
    setup_venv()
    install_dependencies()
    setup_env_file()
    load_env()
    
    # Print configuration
    print_colored(Colors.BLUE, "\n" + "=" * 60)
    print_colored(Colors.GREEN, "📋 Configuration:")
    print(f"   DATABASE_URL: {os.getenv('DATABASE_URL', 'sqlite:///./test.db')}")
    print(f"   S3_BUCKET_NAME: {os.getenv('S3_BUCKET_NAME', 'not set')}")
    print(f"   AWS_REGION: {os.getenv('AWS_REGION', 'ap-south-1')}")
    print_colored(Colors.BLUE, "=" * 60)
    
    if setup_only:
        print_colored(Colors.GREEN, "\n✅ Setup complete! Run 'python run_local.py' to start the server.")
    else:
        run_server()

if __name__ == "__main__":
    main()
