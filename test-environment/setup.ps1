# AIGRC Test Environment Setup Script (PowerShell)
# Run this from the test-environment directory

$ErrorActionPreference = "Stop"

Write-Host "=== AIGRC Test Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
Push-Location "$PSScriptRoot\.."

try {
    Write-Host "1. Installing dependencies..." -ForegroundColor Yellow
    pnpm install

    Write-Host ""
    Write-Host "2. Building packages..." -ForegroundColor Yellow
    pnpm run build

    Write-Host ""
    Write-Host "3. Verifying CLI..." -ForegroundColor Yellow
    node packages/cli/dist/aigrc.js --version

    Write-Host ""
    Write-Host "4. Creating test configuration..." -ForegroundColor Yellow
    Set-Location test-environment

    @"
profiles:
  - eu-ai-act
  - us-omb-m24
  - nist-ai-rmf
  - iso-42001
outputDir: .aigrc
stackProfiles: true
"@ | Out-File -FilePath ".aigrc.yaml" -Encoding utf8

    # Create reports directory
    New-Item -ItemType Directory -Force -Path "reports" | Out-Null

    Write-Host ""
    Write-Host "=== Setup Complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test commands (run from test-environment directory):" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Validate assets"
    Write-Host "  node ../packages/cli/dist/aigrc.js validate assets/*.yaml"
    Write-Host ""
    Write-Host "  # List profiles"
    Write-Host "  node ../packages/cli/dist/aigrc.js compliance list"
    Write-Host ""
    Write-Host "  # Classify asset"
    Write-Host "  node ../packages/cli/dist/aigrc.js classify assets/high-risk-agent.asset.yaml --all"
    Write-Host ""
    Write-Host "  # Check compliance"
    Write-Host "  node ../packages/cli/dist/aigrc.js check assets/high-risk-agent.asset.yaml --profiles eu-ai-act us-omb-m24 --verbose"
    Write-Host ""
    Write-Host "  # Generate artifacts"
    Write-Host "  node ../packages/cli/dist/aigrc.js generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --all"
    Write-Host ""
    Write-Host "  # Generate reports"
    Write-Host "  node ../packages/cli/dist/aigrc.js report gap assets/high-risk-agent.asset.yaml --output reports/gap.md"
    Write-Host ""
}
finally {
    Pop-Location
}
