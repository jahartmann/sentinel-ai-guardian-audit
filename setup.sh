#!/bin/bash

# SecureAI Appliance Setup Script

echo "🔧 Setting up SecureAI Appliance..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! npx semver -r ">=18.0.0" "$NODE_VERSION" &> /dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to 18+ or higher."
    exit 1
fi

echo "✅ Node.js $NODE_VERSION found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if Ollama is available (optional)
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found - KI features will be available"
    echo "💡 Make sure Ollama is running: ollama serve"
else
    echo "⚠️  Ollama not found - KI features will be disabled"
    echo "💡 Install Ollama for AI-powered analysis: https://ollama.ai"
fi

# Create production build
echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting SecureAI Appliance..."
echo "📍 Application will be available at: http://localhost:3000"
echo "🛑 Press Ctrl+C to stop"
npm run start
EOF

chmod +x start.sh

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the application: ./start.sh"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Configure Ollama in Settings (if available)"
echo "   4. Add your first server"
echo ""
echo "📚 Documentation: See README.md for detailed instructions"
echo ""