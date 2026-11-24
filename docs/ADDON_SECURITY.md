# Add-on Security

## SSRF Protection

All outbound HTTP requests from the add-on system are protected against SSRF:

1. **Protocol validation**: Only `http://` and `https://` allowed.
2. **Host blocking**: `localhost`, `127.0.0.1`, `::1` blocked.
3. **Private IP blocking**: `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x` blocked.
4. **DNS rebinding protection**: DNS resolution validated against private IP ranges.
5. **Response size limit**: Maximum 1MB response body.
6. **Timeout**: 10 second timeout on all requests.

## Ownership Enforcement

- All add-on operations require valid session token.
- User can only access/modify their own add-ons.
- Add-on ID ownership verified on every operation.
- Cross-user access returns 404 (not 403) to prevent enumeration.

## Secret Redaction

- Manifest URLs encrypted at rest (AES-256-CBC).
- No secrets in logs or error messages.
- Token hashes stored, not plaintext tokens.

## Rate Limiting

- Recommended: 100 requests/minute per user on add-on endpoints.
- Preview endpoint: 10 requests/minute per user.

## Input Validation

- Zod validation on all inputs.
- Manifest URL must be valid URL.
- Manifest must be valid JSON object.
- Required fields enforced.
