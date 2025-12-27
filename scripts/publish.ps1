# AIGRC npm Publish Script (PowerShell)
# Run from the repository root: .\scripts\publish.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== AIGRC npm Publish Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
try {
    $whoami = npm whoami 2>$null
    if (-not $whoami) { throw }
    Write-Host "✓ Logged in as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to npm. Please run: npm login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Confirm publishing
$confirm = Read-Host "Publish packages to npm as '$whoami'? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Aborted."
    exit 0
}

# Build all packages first
Write-Host ""
Write-Host "Building packages..." -ForegroundColor Yellow
pnpm run build

# Publish in dependency order
Write-Host ""
Write-Host "Publishing @aigrc/core@0.1.0..." -ForegroundColor Yellow
Push-Location packages/core
npm publish --access public
Pop-Location

Write-Host ""
Write-Host "Publishing @aigrc/cli@0.1.0..." -ForegroundColor Yellow
Push-Location packages/cli
npm publish --access public
Pop-Location

Write-Host ""
Write-Host "Publishing @aigrc/mcp@2.0.0..." -ForegroundColor Yellow
Push-Location packages/mcp
npm publish --access public
Pop-Location

Write-Host ""
Write-Host "=== All packages published! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Verify at:"
Write-Host "  - https://www.npmjs.com/package/@aigrc/core"
Write-Host "  - https://www.npmjs.com/package/@aigrc/cli"
Write-Host "  - https://www.npmjs.com/package/@aigrc/mcp"
Write-Host ""
Write-Host "Users can now install with:"
Write-Host "  npm install -g @aigrc/cli"
Write-Host "  npx aigrc --help"
