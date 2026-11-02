#Requires -Version 5.1
<#
.SYNOPSIS
  First-time setup for ARENA GRAPHICS on Windows.
.DESCRIPTION
  Verifies tooling, installs dependencies, creates .env, and applies database migrations.
  Safe to re-run. Does not overwrite an existing .env.
#>
[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$Seed
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name, [string]$Hint) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "$Name was not found on PATH. $Hint"
  }
  return $cmd
}

Write-Host "ARENA GRAPHICS — setup" -ForegroundColor White
Write-Host "Project root: $root" -ForegroundColor DarkGray

Write-Step "Checking toolchain"
$node = Assert-Command 'node' 'Install Node.js 22.12+ from https://nodejs.org.'
$pnpm = Assert-Command 'pnpm' 'Install pnpm 10+ with: npm install -g pnpm@10'
$nodeVersion = (& node --version).Trim()
$pnpmVersion = (& pnpm --version).Trim()
Write-Host "  Node.js : $nodeVersion"
Write-Host "  pnpm    : $pnpmVersion"

$majorNode = [int](($nodeVersion.TrimStart('v') -split '\.')[0])
if ($majorNode -lt 22) {
  throw "Node.js 22.12 or newer is required. Found $nodeVersion."
}

Write-Step "Preparing environment file"
if (-not (Test-Path (Join-Path $root '.env'))) {
  Copy-Item (Join-Path $root '.env.example') (Join-Path $root '.env')
  Write-Host "  Created .env from .env.example" -ForegroundColor Green
} else {
  Write-Host "  .env already exists — left unchanged" -ForegroundColor Yellow
}

if (-not $SkipInstall) {
  Write-Step "Installing workspace dependencies"
  & pnpm install
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed with exit code $LASTEXITCODE." }
} else {
  Write-Host "  Skipped dependency installation (-SkipInstall)" -ForegroundColor Yellow
}

Write-Step "Applying database migrations"
& pnpm db:migrate
if ($LASTEXITCODE -ne 0) { throw "Database migration failed with exit code $LASTEXITCODE." }

if ($Seed) {
  Write-Step "Seeding demo tournament data"
  & pnpm db:seed
  if ($LASTEXITCODE -ne 0) { throw "Database seed failed with exit code $LASTEXITCODE." }
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start the application with:" -ForegroundColor White
Write-Host "  pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dashboard : http://localhost:5173" -ForegroundColor DarkGray
Write-Host "API health: http://127.0.0.1:4000/api/health" -ForegroundColor DarkGray
