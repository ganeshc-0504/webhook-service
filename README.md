# Webhook Service

A secure, production-ready webhook receiver service with HMAC signature verification, structured logging, and defensive error handling.

## Features

- **HMAC-SHA256 Signature Verification** - Ensures webhook authenticity using timing-safe comparison
- **Raw Body Handling** - Captures exact request bytes before JSON parsing for accurate signature verification
- **Structured JSON Logging** - Production-ready logs with event tracking and metadata
- **Defensive Error Handling** - Gracefully handles malformed input without crashing
- **Clean Architecture** - Separation of HTTP layer, business logic, and utilities
- **Unknown Event Handling** - Logs and accepts unknown event types (202 Accepted)
- **Dead-Letter Queue** - Tracks failed events for debugging
- **Webhook Versioning Support** - Handles X-Webhook-Version header
- **Request Size Limits** - Prevents DoS attacks with 1MB body limit

## Project Structure

```
webhook-service/
├── src/
│   ├── config/
│   │   └── env.js                 # Environment configuration
│   ├── middleware/
│   │   ├── rawBodyParser.js       # Raw body capture middleware
│   │   └── errorHandler.js        # Global error handler
│   ├── routes/
│   │   └── webhooks.js            # Webhook routes
│   ├── services/
│   │   └── orderService.js        # Business logic
│   ├── utils/
│   │   ├── signatureVerifier.js   # HMAC verification
│   │   ├── logger.js              # Structured logging
│   │   └── validator.js           # Payload validation
│   ├── app.js                     # Express app setup
│   └── server.js                  # Server entry point
├── .env                           # Environment variables (create from .env.example)
├── .env.example                   # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webhook-service
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your webhook secret
# WEBHOOK_SECRET=your-secret-key-here-change-in-production
```

4. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

 ## How Signature Verification Works

### HMAC-SHA256 Signature Process

The webhook provider generates a signature for each request:

```
signature = HMAC-SHA256(secret, raw_request_body)
```

**Critical Implementation Details:**

1. **Raw Body Requirement**: The signature MUST be computed using the exact bytes received, not re-serialized JSON. This is why we capture `req.rawBody` before JSON parsing.

2. **Timing-Safe Comparison**: We use `crypto.timingSafeEqual()` to prevent timing attacks that could leak information about the secret key.

3. **Verification Flow**:
   ```javascript
   // 1. Capture raw body (middleware)
   req.rawBody = '<exact bytes received>';
   
   // 2. Compute expected signature
   const expectedSignature = crypto
     .createHmac('sha256', secret)
     .update(req.rawBody, 'utf8')
     .digest('hex');
   
   // 3. Compare using timing-safe method
   crypto.timingSafeEqual(
     Buffer.from(receivedSignature),
     Buffer.from(expectedSignature)
   );
   ```

4. **Why This Matters**: Without raw body handling, if we re-serialize the parsed JSON, whitespace and key ordering differences would cause signature mismatches even for valid requests.

## API Endpoints

### POST /webhooks/provider-x

Receive and process webhooks from the external provider.

**Headers:**
- `X-Signature` (required) - HMAC-SHA256 signature
- `X-Event-Type` (required) - Event type (order.created | order.updated | order.cancelled)
- `X-Webhook-Version` (optional) - Webhook version

**Request Body:**
```json
{
  "eventId": "evt_123",
  "orderId": "ord_456",
  "amount": 1200,
  "currency": "INR",
  "timestamp": 1712345678
}
```

**Response Codes:**
- `200 OK` - Successfully processed
- `202 Accepted` - Unknown event type (logged, not processed)
- `400 Bad Request` - Invalid payload or malformed JSON
- `401 Unauthorized` - Invalid or missing signature
- `500 Internal Server Error` - Processing failure

### GET /webhooks/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T06:42:00.000Z"
}
```

## Example Requests

### Valid Webhook Request

```bash
# Generate signature (example using openssl)
SECRET="your-secret-key-here-change-in-production"
PAYLOAD='{"eventId":"evt_123","orderId":"ord_456","amount":1200,"currency":"INR","timestamp":1712345678}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Send webhook
curl -X POST http://localhost:3000/webhooks/provider-x \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Event-Type: order.created" \
  -d "$PAYLOAD"
```

**Expected Response:**
```json
{
  "message": "Webhook processed successfully",
  "eventId": "evt_123",
  "orderId": "ord_456"
}
```

### Invalid Signature

```bash
curl -X POST http://localhost:3000/webhooks/provider-x \
  -H "Content-Type: application/json" \
  -H "X-Signature: invalid-signature" \
  -H "X-Event-Type: order.created" \
  -d '{"eventId":"evt_123","orderId":"ord_456","amount":1200,"currency":"INR","timestamp":1712345678}'
```

**Expected Response (401):**
```json
{
  "error": "Invalid signature"
}
```

### Malformed JSON

```bash
curl -X POST http://localhost:3000/webhooks/provider-x \
  -H "Content-Type: application/json" \
  -H "X-Signature: some-signature" \
  -H "X-Event-Type: order.created" \
  -d '{"invalid json'
```

**Expected Response (400):**
```json
{
  "error": "Invalid JSON payload"
}
```

### Unknown Event Type

```bash
SECRET="your-secret-key-here-change-in-production"
PAYLOAD='{"eventId":"evt_999","orderId":"ord_999","amount":500,"currency":"INR","timestamp":1712345678}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/provider-x \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Event-Type: order.unknown" \
  -d "$PAYLOAD"
```

**Expected Response (202):**
```json
{
  "message": "Event accepted but not processed (unknown type)",
  "eventId": "evt_999"
}
```

## Logging

All logs are output in structured JSON format for easy parsing and analysis.

**Example Log Entry:**
```json
{
  "timestamp": "2026-01-28T06:42:00.123Z",
  "level": "INFO",
  "message": "Webhook event processed",
  "eventId": "evt_123",
  "eventType": "order.created",
  "orderId": "ord_456",
  "processingStatus": "processed",
  "processingTime": 15,
  "webhookVersion": "1.0"
}
```

**Log Levels:**
- `INFO` - Normal operations
- `WARN` - Warnings (invalid signatures, unknown events, etc.)
- `ERROR` - Errors (processing failures, server errors)

**Security Note:** No secrets are logged. The webhook secret never appears in logs.

## Production Risks with Webhooks

### 1. **Replay Attacks**

**Risk:** An attacker intercepts a valid webhook and replays it multiple times.

**Mitigation:**
- Implement idempotency using `eventId` as a unique key
- Track processed event IDs and reject duplicates
- Add timestamp validation (reject events older than X minutes)

### 2. **Denial of Service (DoS)**

**Risk:** Attacker floods the webhook endpoint with requests.

**Mitigation:**
- Implement rate limiting (e.g., using `express-rate-limit`)
- Set request body size limits (already implemented: 1MB)
- Use a reverse proxy (nginx) with connection limits
- Consider webhook queuing to handle bursts

### 3. **Secret Key Compromise**

**Risk:** If the webhook secret is leaked, attackers can send forged webhooks.

**Mitigation:**
- Store secrets in secure vaults (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets per environment
- Never commit secrets to version control
- Implement secret rotation without downtime (support multiple valid secrets)

### 4. **Timing Attacks**

**Risk:** Attackers measure response times to guess the secret.

**Mitigation:**
- Use `crypto.timingSafeEqual()` for signature comparison (already implemented)
- Ensure constant-time operations in security-critical code

### 5. **Event Ordering Issues**

**Risk:** Webhooks may arrive out of order (e.g., `order.updated` before `order.created`).

**Mitigation:**
- Use timestamps to determine event order
- Implement event versioning
- Design business logic to handle out-of-order events gracefully

## Multi-Instance Deployment Considerations

When running multiple instances of this service (e.g., Kubernetes, load balancer), several changes are needed:

### 1. **Shared State Management**

**Current:** In-memory Map for order storage

**Required:** Distributed storage
- Use Redis, PostgreSQL, or MongoDB
- Ensure atomic operations for concurrent updates
- Implement proper locking mechanisms

### 2. **Idempotency**

**Current:** Basic duplicate detection

**Required:** Distributed idempotency
- Store processed `eventId`s in shared cache (Redis)
- Set TTL on idempotency keys (e.g., 24 hours)
- Use distributed locks for critical sections

### 3. **Logging and Observability**

**Current:** Console logs (stdout)

**Required:** Centralized logging
- Use log aggregation (ELK stack, Splunk, CloudWatch)
- Add correlation IDs for request tracing
- Implement distributed tracing (OpenTelemetry)
- Add metrics (Prometheus, Grafana)

### 4. **Load Balancing**

**Considerations:**
- Use sticky sessions if maintaining any request-level state
- Ensure health check endpoint (`/webhooks/health`) is monitored
- Implement graceful shutdown to finish processing in-flight requests

### 5. **Database Transactions**

**Required:**
- Use database transactions for multi-step operations
- Implement optimistic locking to handle concurrent updates
- Consider event sourcing for audit trail

### 6. **Queue-Based Processing**

**Recommended Architecture:**
```
Webhook Receiver → Message Queue (RabbitMQ/SQS) → Worker Instances
```

**Benefits:**
- Decouples receiving from processing
- Enables retry logic
- Handles traffic spikes
- Allows horizontal scaling of workers

### 7. **Configuration Management**

**Required:**
- Centralized config management (Consul, etcd)
- Environment-specific secrets (per instance)
- Feature flags for gradual rollouts

## Development

### Running Tests

```bash
npm test
```

(Note: Test suite not implemented in this version)

### Code Structure

- **Routes** (`src/routes/`) - HTTP request handling
- **Services** (`src/services/`) - Business logic (separated from HTTP)
- **Middleware** (`src/middleware/`) - Request processing pipeline
- **Utils** (`src/utils/`) - Reusable utilities (logging, validation, crypto)
- **Config** (`src/config/`) - Environment configuration

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request