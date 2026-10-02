# ============================================================
# deploy-setup.ps1 — One-shot Vercel deployment + env setup
# ============================================================
# USAGE:
#   1. Login to Vercel first:  npx vercel login
#   2. Run this script:        powershell -ExecutionPolicy Bypass -File .\scripts\deploy-setup.ps1
#
# You will be prompted for secrets interactively — nothing is
# stored in this file or in chat history.
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "`n=== Step 1: Vercel login check ===" -ForegroundColor Cyan
$whoami = npx vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Running vercel login..." -ForegroundColor Yellow
    npx vercel login
}
Write-Host "Logged in as: $whoami" -ForegroundColor Green

Write-Host "`n=== Step 2: Link / create Vercel project ===" -ForegroundColor Cyan
# If already linked (has .vercel/project.json), skip. Otherwise link.
if (-not (Test-Path ".vercel\project.json")) {
    npx vercel link --yes --project "payaswini-o-bele"
} else {
    Write-Host "Project already linked." -ForegroundColor Green
}

Write-Host "`n=== Step 3: Collect secrets ===" -ForegroundColor Cyan
$neonUrl    = Read-Host "Paste your Neon DATABASE_URL"
$razorKey   = Read-Host "Paste your Razorpay TEST Key ID (rzp_test_...)"
$razorSec   = Read-Host "Paste your Razorpay TEST Key Secret" -AsSecureString
$razorSecPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($razorSec))
$nextSecret = Read-Host "Paste NEXTAUTH_SECRET (or press Enter to generate a new one)"
if (-not $nextSecret) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $b = New-Object byte[] 48; $rng.GetBytes($b); $rng.Dispose()
    $nextSecret = [Convert]::ToBase64String($b)
    Write-Host "Generated NEXTAUTH_SECRET: $nextSecret" -ForegroundColor Yellow
}
$projectName = Read-Host "Vercel project name (press Enter for 'payaswini-o-bele')"
if (-not $projectName) { $projectName = "payaswini-o-bele" }
$vercelUrl = "https://${projectName}.vercel.app"

Write-Host "`n=== Step 4: Set environment variables ===" -ForegroundColor Cyan
Write-Host "NEXTAUTH_URL will be: $vercelUrl" -ForegroundColor Yellow

# Server-only vars (Production + Preview + Development)
$envVars = @(
    @{ key = "DATABASE_URL";             value = $neonUrl;                          env = "production,preview,development" },
    @{ key = "NEXTAUTH_SECRET";          value = $nextSecret;                       env = "production,preview,development" },
    @{ key = "NEXTAUTH_URL";             value = $vercelUrl;                        env = "production,preview,development" },
    @{ key = "RAZORPAY_KEY_ID";          value = $razorKey;                         env = "production,preview,development" },
    @{ key = "RAZORPAY_KEY_SECRET";      value = $razorSecPlain;                    env = "production,preview,development" },
    @{ key = "NEXT_PUBLIC_RAZORPAY_KEY_ID"; value = $razorKey;                      env = "production,preview,development" },
    @{ key = "NEXT_PUBLIC_APP_URL";      value = $vercelUrl;                        env = "production,preview,development" }
)

foreach ($var in $envVars) {
    Write-Host "  Setting $($var.key)..." -NoNewline
    # --force overwrites if already set
    npx vercel env add $var.key $var.env --force --value $var.value 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
}

Write-Host "`n=== Step 5: Deploy ===" -ForegroundColor Cyan
$n = Read-Host "Deploy now? (Y/n)"
if ($n -ne "n") {
    Write-Host "Deploying to Production..." -ForegroundColor Yellow
    npx vercel --prod --yes
    Write-Host "`n=== DONE ===" -ForegroundColor Green
    Write-Host "Live at: $vercelUrl" -ForegroundColor Cyan
} else {
    Write-Host "`nSkipped deploy. To deploy later:" -ForegroundColor Yellow
    Write-Host "  npx vercel --prod" -ForegroundColor White
}
