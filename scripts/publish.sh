#!/bin/bash
# AIGRC npm publish script
# Run from the repository root: ./scripts/publish.sh

set -e

echo "=== AIGRC npm Publish Script ==="
echo ""

# Check if logged in
WHOAMI=$(npm whoami 2>/dev/null || echo "")
if [ -z "$WHOAMI" ]; then
    echo "❌ Not logged in to npm. Please run: npm login"
    exit 1
fi

echo "✓ Logged in as: $WHOAMI"
echo ""

# Confirm publishing
read -p "Publish packages to npm as '$WHOAMI'? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Build all packages first
echo ""
echo "Building packages..."
pnpm run build

# Publish in dependency order
echo ""
echo "Publishing @aigrc/core@0.1.0..."
cd packages/core
npm publish --access public
cd ../..

echo ""
echo "Publishing @aigrc/cli@0.1.0..."
cd packages/cli
npm publish --access public
cd ../..

echo ""
echo "Publishing @aigrc/mcp@2.0.0..."
cd packages/mcp
npm publish --access public
cd ../..

echo ""
echo "=== All packages published! ==="
echo ""
echo "Verify at:"
echo "  - https://www.npmjs.com/package/@aigrc/core"
echo "  - https://www.npmjs.com/package/@aigrc/cli"
echo "  - https://www.npmjs.com/package/@aigrc/mcp"
echo ""
echo "Users can now install with:"
echo "  npm install -g @aigrc/cli"
echo "  npx aigrc --help"
