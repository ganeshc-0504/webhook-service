# Quick Start Guide

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   # The .env file is already created from .env.example
   # Edit if you want to change the secret or port
   ```

3. **Start the server**:
   ```bash
   # Development mode (auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## Testing

### Option 1: Node.js Test Script
```bash
node test-webhooks.js
```

### Option 2: PowerShell Test Script (Windows)
```powershell
.\test-webhooks.ps1
```

### Option 3: Manual curl (Linux/Mac)
```bash
SECRET="your-secret-key-here-change-in-production"
PAYLOAD='{"eventId":"evt_123","orderId":"ord_456","amount":1200,"currency":"INR","timestamp":1712345678}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/provider-x \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Event-Type: order.created" \
  -d "$PAYLOAD"
```

### Option 4: Manual PowerShell (Windows)
```powershell
$SECRET = "your-secret-key-here-change-in-production"
$PAYLOAD = '{"eventId":"evt_123","orderId":"ord_456","amount":1200,"currency":"INR","timestamp":1712345678}'

$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($SECRET)
$hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($PAYLOAD))
$SIGNATURE = [BitConverter]::ToString($hash).Replace("-", "").ToLower()

$headers = @{
    "Content-Type" = "application/json"
    "X-Signature" = $SIGNATURE
    "X-Event-Type" = "order.created"
}

Invoke-WebRequest -Uri "http://localhost:3000/webhooks/provider-x" `
    -Method POST `
    -Headers $headers `
    -Body $PAYLOAD
```

## API Endpoints

### POST /webhooks/provider-x
Receive webhook events

**Headers**:
- `X-Signature`: HMAC-SHA256 signature (required)
- `X-Event-Type`: Event type (required)
- `X-Webhook-Version`: Version (optional)

**Response Codes**:
- `200` - Successfully processed
- `202` - Unknown event type (accepted but not processed)
- `400` - Invalid payload
- `401` - Invalid signature
- `500` - Processing error

### GET /webhooks/health
Health check endpoint

**Response**: `{ "status": "healthy", "timestamp": "..." }`

## Supported Event Types

- `order.created` - Create new order
- `order.updated` - Update existing order
- `order.cancelled` - Cancel order

Unknown event types are logged and return `202 Accepted`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `WEBHOOK_SECRET` | HMAC secret key | (required) |
| `NODE_ENV` | Environment | `development` |

## Logs

All logs are in JSON format. Example:

```json
{
  "timestamp": "2026-01-28T06:52:39.944Z",
  "level": "INFO",
  "message": "Webhook event processed",
  "eventId": "evt_001",
  "eventType": "order.created",
  "orderId": "ord_001",
  "processingStatus": "processed"
}
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify `.env` file exists with `WEBHOOK_SECRET` set

### Signature verification fails
- Ensure you're using the exact same secret
- Verify raw body is being used (not re-serialized JSON)
- Check for whitespace differences in payload

### Logs not showing
- Logs go to stdout/stderr
- Check console output where server is running

## Production Deployment

Before deploying to production:

1. **Change the webhook secret** in `.env`
2. **Use environment variables** instead of `.env` file
3. **Set up log aggregation** (ELK, CloudWatch, etc.)
4. **Implement rate limiting**
5. **Add monitoring and alerts**
6. **Use HTTPS** (reverse proxy like nginx)
7. **Consider idempotency** for duplicate events
8. **Set up database** for persistent storage

See [README.md](README.md) for detailed production considerations.
