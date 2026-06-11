Write-Host ""
Write-Host "  === Kuanzhai Orbit Liuyao Divination ===" -ForegroundColor Cyan
Write-Host ""

$question = Read-Host "Enter your question (e.g. How is my career?)"
if ([string]::IsNullOrWhiteSpace($question)) {
    Write-Host "Question cannot be empty." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Generating divination, please wait..." -ForegroundColor Green
Write-Host ""

$lines = @(1..6 | ForEach-Object { Get-Random -Minimum 0 -Maximum 2 })
$movingCount = Get-Random -Minimum 1 -Maximum 3
$movingLines = @(1..6 | Get-Random -Count $movingCount | Sort-Object)

$body = @{
    question = $question
    questionTag = "general"
    lines = $lines
    movingLines = $movingLines
    datetime = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/liuyao/app/chat/start" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 120

    if ($result.success) {
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "  AI Interpretation Report" -ForegroundColor Yellow
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $result.data.reply.text
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "  Session ID: $($result.data.session.sessionId)" -ForegroundColor Gray
    } else {
        Write-Host "Request failed: $($result.error.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure BFF server is running on port 3001" -ForegroundColor Yellow
}
