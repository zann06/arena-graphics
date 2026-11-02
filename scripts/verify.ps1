#Requires -Version 5.1
<#
.SYNOPSIS
  Runs the full ARENA GRAPHICS verification pipeline.
.DESCRIPTION
  TypeScript checks, ESLint, unit tests, production build, and the integration +
  overlay suite (state recovery, MLBB, templates/assets, OBS mock, overlay
  captures, transparency/1920×1080). Starts a server for the integration stage if
  one is not already running, and stops it afterwards.
  Stops at the first failing stage and exits with a non-zero code.
#>
[CmdletBinding()]
param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$script:failed = $false

function Invoke-Stage([string]$Name, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  $started = Get-Date
  & $Action
  $code = $LASTEXITCODE
  $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  if ($code -ne 0) {
    Write-Host "FAILED: $Name (exit $code, ${elapsed}s)" -ForegroundColor Red
    $script:failed = $true
    return $false
  }
  Write-Host "PASSED: $Name (${elapsed}s)" -ForegroundColor Green
  return $true
}

$ok = Invoke-Stage 'TypeScript checks' { & pnpm typecheck }
if ($ok) { $ok = Invoke-Stage 'ESLint' { & pnpm lint } }
if ($ok) { $ok = Invoke-Stage 'Unit tests' { & pnpm test:unit } }
if ($ok -and -not $SkipBuild) { $ok = Invoke-Stage 'Production build' { & pnpm build } }

# Integration + overlay checks need a running server. Start one if needed and
# always stop it afterwards.
if ($ok) {
  $startedServer = $false
  try {
    $health = $null
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 2
    } catch {
      $health = $null
    }
    if (-not $health) {
      Write-Host ""
      Write-Host "Starting server for integration tests..." -ForegroundColor Cyan
      & node scripts/start-server.mjs --stop | Out-Null
      & node scripts/start-server.mjs | Out-Null
      $startedServer = $true
    }
    $ok = Invoke-Stage 'Integration + overlay checks' { & node scripts/integration-suite.mjs }
  } finally {
    if ($startedServer) {
      & node scripts/start-server.mjs --stop | Out-Null
    }
  }
}

Write-Host ""
if ($script:failed) {
  Write-Host "Verification failed." -ForegroundColor Red
  exit 1
}

Write-Host "All verification stages passed." -ForegroundColor Green
exit 0
