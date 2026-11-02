#Requires -Version 5.1
<#
.SYNOPSIS
  Starts the ARENA GRAPHICS development servers (Fastify API + Vite dashboard).
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path (Join-Path $root '.env'))) {
  Write-Host "No .env found. Creating one from .env.example..." -ForegroundColor Yellow
  Copy-Item (Join-Path $root '.env.example') (Join-Path $root '.env')
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "Dependencies are not installed. Running pnpm install..." -ForegroundColor Yellow
  & pnpm install
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
}

if (-not (Test-Path (Join-Path $root 'database\migrations'))) {
  Write-Host "No migrations found. Run 'pnpm db:generate' after changing the schema." -ForegroundColor Yellow
}

Write-Host "Starting ARENA GRAPHICS..." -ForegroundColor Cyan
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor DarkGray
Write-Host "  API      : http://127.0.0.1:4000/api/health" -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

& pnpm dev
exit $LASTEXITCODE
