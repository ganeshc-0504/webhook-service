$BASE_URL = "http://localhost:3000"
$SECRET = "your-secret-key-here-change-in-production"

function Get-HmacSignature {
    param (
        [string]$Payload,
        [string]$Secret
    )
    
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Payload))
    $signature = [BitConverter]::ToString($hash).Replace("-", "").ToLower()
    return $signature
}

function Send-Webhook {
    param (
        [string]$Payload,
        [string]$EventType,
        [string]$Signature
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "X-Signature"  = $Signature
        "X-Event-Type" = $EventType
    }
    
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL/webhooks/provider-x" `
            -Method POST `
            -Headers $headers `
            -Body $Payload `
            -UseBasicParsing
        
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Yellow
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Cyan
    }
}

Write-Host "`n=== Webhook Service Test Script ===" -ForegroundColor Magenta
Write-Host ""

Write-Host "Test 1: Valid order.created event" -ForegroundColor Yellow
$payload = '{"eventId":"evt_ps_001","orderId":"ord_ps_001","amount":1200,"currency":"INR","timestamp":1712345678}'
$signature = Get-HmacSignature -Payload $payload -Secret $SECRET
Send-Webhook -Payload $payload -EventType "order.created" -Signature $signature
Write-Host ""

Write-Host "Test 2: Valid order.updated event" -ForegroundColor Yellow
$payload = '{"eventId":"evt_ps_002","orderId":"ord_ps_001","amount":1500,"currency":"INR","timestamp":1712345679}'
$signature = Get-HmacSignature -Payload $payload -Secret $SECRET
Send-Webhook -Payload $payload -EventType "order.updated" -Signature $signature
Write-Host ""

Write-Host "Test 3: Invalid signature (should return 401)" -ForegroundColor Yellow
$payload = '{"eventId":"evt_ps_003","orderId":"ord_ps_002","amount":500,"currency":"INR","timestamp":1712345680}'
Send-Webhook -Payload $payload -EventType "order.created" -Signature "invalid-signature-12345"
Write-Host ""

Write-Host "Test 4: Unknown event type (should return 202)" -ForegroundColor Yellow
$payload = '{"eventId":"evt_ps_004","orderId":"ord_ps_003","amount":800,"currency":"INR","timestamp":1712345681}'
$signature = Get-HmacSignature -Payload $payload -Secret $SECRET
Send-Webhook -Payload $payload -EventType "order.unknown" -Signature $signature
Write-Host ""

Write-Host "Test 5: Missing required field (should return 400)" -ForegroundColor Yellow
$payload = '{"eventId":"evt_ps_005","amount":1000,"currency":"INR","timestamp":1712345682}'
$signature = Get-HmacSignature -Payload $payload -Secret $SECRET
Send-Webhook -Payload $payload -EventType "order.created" -Signature $signature
Write-Host ""

Write-Host "Test 6: Health check endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/webhooks/health" -Method GET -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== All tests completed ===" -ForegroundColor Magenta
