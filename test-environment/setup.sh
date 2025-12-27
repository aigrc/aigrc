#!/bin/bash
# AIGRC Test Environment Setup Script
# Run this from the test-environment directory

set -e

echo "=== AIGRC Test Environment Setup ==="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "1. Installing dependencies..."
pnpm install

echo ""
echo "2. Building packages..."
pnpm run build

echo ""
echo "3. Verifying CLI..."
node packages/cli/dist/aigrc.js --version

echo ""
echo "4. Creating test configuration..."
cd test-environment

cat > .aigrc.yaml << 'EOF'
profiles:
  - eu-ai-act
  - us-omb-m24
  - nist-ai-rmf
  - iso-42001
outputDir: .aigrc
stackProfiles: true
EOF

# Create reports directory
mkdir -p reports

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Test commands (run from test-environment directory):"
echo ""
echo "  # Validate assets"
echo "  node ../packages/cli/dist/aigrc.js validate assets/*.yaml"
echo ""
echo "  # List profiles"
echo "  node ../packages/cli/dist/aigrc.js compliance list"
echo ""
echo "  # Classify asset"
echo "  node ../packages/cli/dist/aigrc.js classify assets/high-risk-agent.asset.yaml --all"
echo ""
echo "  # Check compliance"
echo "  node ../packages/cli/dist/aigrc.js check assets/high-risk-agent.asset.yaml --profiles eu-ai-act us-omb-m24 --verbose"
echo ""
echo "  # Generate artifacts"
echo "  node ../packages/cli/dist/aigrc.js generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --all"
echo ""
echo "  # Generate reports"
echo "  node ../packages/cli/dist/aigrc.js report gap assets/high-risk-agent.asset.yaml --output reports/gap.md"
echo ""
