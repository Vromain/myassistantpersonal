# API Contracts

This directory contains OpenAPI 3.0 specifications for the AI-Powered Communication Hub backend API.

## Files

- **openapi.yaml** - Main API specification with all endpoint references
- **schemas.yaml** - Reusable data models and response schemas
- **auth.yaml** - OAuth2 authentication endpoints
- **messages.yaml** - Message management endpoints (fetch, reply, archive, search)
- **accounts.yaml** - Connected account management
- **categories.yaml** - Message categorization CRUD operations
- **ai.yaml** - AI service endpoints (replies, categorization, priority scoring)
- **notifications.yaml** - Notification preferences and device registration
- **analytics.yaml** - Analytics and statistics endpoints

## Usage

### Viewing the API Documentation

Use Swagger UI or Redoc to view the interactive API documentation:

```bash
# Using npx with Redoc
npx @redocly/cli preview-docs contracts/openapi.yaml

# Using Swagger UI Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/contracts/openapi.yaml -v $(pwd)/contracts:/contracts swaggerapi/swagger-ui
```

### Generating Client Code

Generate type-safe client libraries using OpenAPI Generator:

**TypeScript (for Node.js backend)**:
```bash
npx @openapitools/openapi-generator-cli generate \
  -i contracts/openapi.yaml \
  -g typescript-axios \
  -o backend/src/generated/api
```

**Dart (for Flutter app)**:
```bash
# Install openapi-generator-cli
brew install openapi-generator

# Generate Dart client
openapi-generator generate \
  -i contracts/openapi.yaml \
  -g dart \
  -o myassistanpersonal/lib/generated/api \
  --additional-properties pubName=communication_hub_api
```

### Validating the Specification

```bash
# Using Redocly CLI
npx @redocly/cli lint contracts/openapi.yaml

# Using Swagger CLI
npx @apidevtools/swagger-cli validate contracts/openapi.yaml
```

## Authentication

All endpoints (except `/auth/*`) require Bearer authentication with a JWT token:

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

1. Initiate OAuth2 flow: `GET /auth/{platform}/authorize`
2. Handle callback: `GET /auth/{platform}/callback?code=...&state=...`
3. Receive JWT `access_token` and `refresh_token`
4. Include `access_token` in `Authorization` header for subsequent requests

## Rate Limiting

API rate limits:
- **Default**: 100 requests per minute per user
- **AI endpoints**: 10 requests per minute per user
- **Search**: 30 requests per minute per user

Rate limit headers included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Error Handling

All error responses follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `BAD_REQUEST` (400): Invalid request parameters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Unexpected server error
- `AI_SERVICE_UNAVAILABLE` (503): AI service temporarily unavailable

## Functional Requirements Mapping

This API implements the following functional requirements from spec.md:

- **FR-001 to FR-003**: OAuth2 authentication (`/auth/{platform}/*`)
- **FR-004**: Message synchronization (`/accounts/{accountId}/sync`)
- **FR-005 to FR-009**: Message viewing and read status (`/messages`, `/messages/{messageId}/read`)
- **FR-010 to FR-011**: AI reply generation (`/ai/replies`)
- **FR-012 to FR-014**: AI categorization (`/ai/categorize`, `/categories`)
- **FR-015**: Message filtering (`/messages?platform=...&category_id=...`)
- **FR-016 to FR-018**: Notification preferences (`/notifications/preferences`)
- **FR-019**: Analytics (`/analytics/*`)
- **FR-020 to FR-021**: User data management (`/users/me`, `/accounts/{accountId}` DELETE)
- **FR-025**: Search functionality (`/messages/search`)
- **FR-026**: Archive/delete messages (`/messages/{messageId}/archive`, DELETE)
- **FR-027**: Attachments (included in Message schema)

## Testing

### Contract Testing

Use Pact for consumer-driven contract testing between Flutter app and backend:

**Flutter (Consumer)**:
```dart
final pact = PactMockService('FlutterApp', 'BackendAPI');
await pact
  .given('user has unread messages')
  .uponReceiving('a request for messages')
  .withRequest('GET', '/v1/messages?read_status=false')
  .willRespondWith(200, body: messageListMatcher);
```

**Node.js Backend (Provider)**:
```typescript
import { Verifier } from '@pact-foundation/pact';

const verifier = new Verifier({
  providerBaseUrl: 'http://localhost:3000',
  pactUrls: ['contracts/pacts/flutterapp-backendapi.json']
});

await verifier.verifyProvider();
```

### Mock Server

Run a mock API server for development:

```bash
# Using Prism
npx @stoplight/prism-cli mock contracts/openapi.yaml
```

## Versioning

API Version: **v1**

- All endpoints prefixed with `/v1`
- Breaking changes will increment major version (`/v2`)
- Backwards-compatible changes (new fields, endpoints) within same version
- Deprecation policy: 6 months notice before removing endpoints

## Support

For API questions or issues:
- GitHub Issues: https://github.com/yourorg/communication-hub/issues
- Documentation: https://docs.example.com/api
- Email: api-support@example.com

## License

MIT License - See LICENSE file for details
