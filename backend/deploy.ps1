# QGC-Agri Backend Easy Deploy Script
$projectName = "qgc-100"
$serviceName = "qgc-agri"
$region      = "asia-south1"

Write-Host "==============================================" -ForegroundColor Gray
Write-Host "   DEPLOYING: $serviceName to Cloud Run       " -ForegroundColor Cyan
Write-Host "   PROJECT  : $projectName                    " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Gray

# 1. Check for MONGO_URI in .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Out-String
    # Simple regex to extract MONGO_URI value
    if ($envContent -match 'MONGO_URI=(.*)') {
        $mongoUri = $matches[1].Trim()
        Write-Host "[✓] Found MONGO_URI in .env file." -ForegroundColor Green
    } else {
        Write-Host "[!] MONGO_URI not found in .env." -ForegroundColor Yellow
        $mongoUri = Read-Host "Please enter MONGO_URI manually"
    }
} else {
    Write-Host "[!] .env file not found." -ForegroundColor Yellow
    $mongoUri = Read-Host "Please enter MONGO_URI manually"
}

# 2. Set the Google Cloud project
Write-Host "`n[*] Setting gcloud project to $projectName..." -ForegroundColor White
gcloud config set project $projectName

# 3. Deploy to Cloud Run
Write-Host "[*] Submitting build and deploying to Cloud Run..." -ForegroundColor White
gcloud run deploy $serviceName `
    --source . `
    --region $region `
    --set-env-vars "MONGO_URI=$mongoUri" `
    --allow-unauthenticated

if ($LASTEXITCODE -eq 0) {
    $serviceUrl = gcloud run services describe $serviceName --region $region --format='value(status.url)'
    Write-Host "`nSuccess! Deployment finished." -ForegroundColor Green
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
} else {
    Write-Host "`nDeployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
