# ============================================================
# post-deploy.ps1 — Google OAuth callback registration guide
# ============================================================
# Run AFTER deploy-setup.ps1 succeeds and you have your live URL.
# This script just prints instructions — you do the Google Console
# step in your browser.
# ============================================================

$projectName = Read-Host "Your Vercel project name (press Enter for 'payaswini-o-bele')"
if (-not $projectName) { $projectName = "payaswini-o-bele" }
$url = "https://${projectName}.vercel.app"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " POST-DEPLOY CHECKLIST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. DATABASE MIGRATION" -ForegroundColor Yellow
Write-Host "   Run against Neon:" -ForegroundColor White
Write-Host '   $env:DATABASE_URL="your-neon-url"' -ForegroundColor Gray
Write-Host "   npx prisma migrate deploy" -ForegroundColor Gray
Write-Host "   npx prisma db seed" -ForegroundColor Gray
Write-Host ""
Write-Host "2. GOOGLE OAUTH (when ready to enable)" -ForegroundColor Yellow
Write-Host "   Go to: https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "   Find your OAuth Client, add to 'Authorized redirect URIs':" -ForegroundColor White
Write-Host "   $url/api/auth/callback/google" -ForegroundColor Green
Write-Host ""
Write-Host "   Then set these env vars in Vercel (or re-run deploy-setup.ps1):" -ForegroundColor White
Write-Host "   npx vercel env add GOOGLE_CLIENT_ID production,preview,development" -ForegroundColor Gray
Write-Host "   npx vercel env add GOOGLE_CLIENT_SECRET production,preview,development" -ForegroundColor Gray
Write-Host ""
Write-Host "3. VERIFY DEPLOYMENT" -ForegroundColor Yellow
Write-Host "   Open: $url" -ForegroundColor White
Write-Host "   - Home page loads (SSR tools from DB)" -ForegroundColor White
Write-Host "   - Register + OTP flow works" -ForegroundColor White
Write-Host "   - Razorpay test order succeeds" -ForegroundColor White
Write-Host ""
Write-Host "4. RAZORPAY TEST MODE" -ForegroundColor Yellow
Write-Host "   Your test keys (rzp_test_...) work against the Razorpay sandbox." -ForegroundColor White
Write-Host "   No webhook setup needed — payment verify is inline." -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
