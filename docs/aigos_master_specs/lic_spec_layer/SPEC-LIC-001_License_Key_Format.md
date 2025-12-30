# SPEC-LIC-001: License Key Format Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-LIC-001 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Category** | Protocol |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-FMT-001 | .aigrc File Format | License key storage location |

### External Standards

| Standard | Version | URL |
|----------|---------|-----|
| JWT (RFC 7519) | N/A | https://datatracker.ietf.org/doc/html/rfc7519 |
| JWS (RFC 7515) | N/A | https://datatracker.ietf.org/doc/html/rfc7515 |

---

## Abstract

This specification defines the license key format for AIGRC/AIGOS paid tiers (Professional and Enterprise). License keys are self-contained JWT tokens that can be validated locally without server connectivity, enabling the "Local-First" architecture principle. Keys encode feature entitlements, expiration dates, and organizational metadata.

---

## 1. Introduction

### 1.1 Purpose

The license key format enables:

1. **Offline Validation** — Verify licenses without network calls
2. **Feature Gating** — Enable/disable features based on tier
3. **Self-Contained** — All necessary data in the key itself
4. **Tamper-Proof** — Cryptographically signed, cannot be modified
5. **Revocable** — Can be invalidated via online check (optional)

### 1.2 Design Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           LICENSE KEY DESIGN PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. LOCAL-FIRST VALIDATION                                                             │
│      • License can be verified with no network connectivity                             │
│      • Only public key needed for verification                                          │
│      • Offline-first, online-optional                                                   │
│                                                                                         │
│   2. SELF-CONTAINED CLAIMS                                                              │
│      • All entitlements encoded in the token                                            │
│      • No database lookup required                                                      │
│      • Expiration built into token                                                      │
│                                                                                         │
│   3. CRYPTOGRAPHIC INTEGRITY                                                            │
│      • RSA or ECDSA signature                                                           │
│      • Cannot be modified without detection                                             │
│      • Public key distributed with SDK                                                  │
│                                                                                         │
│   4. GRACEFUL DEGRADATION                                                               │
│      • Grace period after expiration                                                    │
│      • Warn before blocking                                                             │
│      • Clear error messages                                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Scope

This specification defines:

- License key structure (JWT format)
- Claims (standard and custom)
- Validation algorithm
- Feature entitlements
- Key rotation

This specification does NOT define:

- License purchasing/provisioning workflow
- Payment processing
- License server implementation

---

## 2. Key Format

### 2.1 Overview

License keys are JSON Web Tokens (JWT) with:

- **Header**: Algorithm and key ID
- **Payload**: Claims (entitlements, expiration, metadata)
- **Signature**: RSA-SHA256 or ECDSA signature

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0yMDI1LTAxIn0.
eyJpc3MiOiJodHRwczovL2xpY2Vuc2UuYWlnb3MuZGV2Iiwic3ViIjoib3JnLWFjb
WUtY29ycCIsImF1ZCI6ImFpZ3JjIiwiZXhwIjoxNzM1Njg5NjAwLCJpYXQiOjE3MDQ
wNjcyMDAsImp0aSI6ImxpYy0xMjM0NTY3OCIsInRpZXIiOiJwcm9mZXNzaW9uYWwiL
CJmZWF0dXJlcyI6WyJraWxsX3N3aXRjaCIsImNhcGFiaWxpdHlfZGVjYXkiLCJwcmlv
cml0eV9zdXBwb3J0Il0sImxpbWl0cyI6eyJhZ2VudHMiOjEwMCwiYXNzZXRzIjo1MDA
sInVzZXJzIjoyNX19.
SIGNATURE_BYTES_BASE64URL
```

### 2.2 Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              JWT LICENSE KEY STRUCTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   HEADER (Base64URL encoded)                                                            │
│   ──────                                                                                │
│   {                                                                                     │
│     "alg": "RS256",           // Algorithm: RS256 or ES256                              │
│     "typ": "JWT",             // Token type                                             │
│     "kid": "key-2025-01"      // Key ID (for rotation)                                  │
│   }                                                                                     │
│                                                                                         │
│   PAYLOAD (Base64URL encoded)                                                           │
│   ───────                                                                               │
│   {                                                                                     │
│     // Standard JWT Claims                                                              │
│     "iss": "https://license.aigos.dev",   // Issuer                                     │
│     "sub": "org-acme-corp",               // Subject (organization ID)                  │
│     "aud": "aigrc",                       // Audience                                   │
│     "exp": 1735689600,                    // Expiration (Unix timestamp)                │
│     "iat": 1704067200,                    // Issued at                                  │
│     "jti": "lic-12345678",                // Unique ID                                  │
│                                                                                         │
│     // AIGOS Custom Claims                                                              │
│     "tier": "professional",               // Tier: community|professional|enterprise    │
│     "features": [...],                    // Enabled features                           │
│     "limits": {...},                      // Usage limits                               │
│     "organization": {...}                 // Organization metadata                      │
│   }                                                                                     │
│                                                                                         │
│   SIGNATURE (Base64URL encoded)                                                         │
│   ─────────                                                                             │
│   RSA-SHA256(base64url(header) + "." + base64url(payload), privateKey)                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Claims

### 3.1 Standard JWT Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Issuer (`https://license.aigos.dev`) |
| `sub` | string | Yes | Subject (organization ID) |
| `aud` | string | Yes | Audience (`aigrc`) |
| `exp` | number | Yes | Expiration time (Unix timestamp) |
| `iat` | number | Yes | Issued at time (Unix timestamp) |
| `nbf` | number | No | Not before time (Unix timestamp) |
| `jti` | string | Yes | Unique token identifier |

### 3.2 Custom Claims

#### 3.2.1 Tier

```typescript
interface TierClaim {
  /** License tier */
  tier: 'community' | 'professional' | 'enterprise';
}
```

#### 3.2.2 Features

```typescript
interface FeaturesClaim {
  /** List of enabled feature flags */
  features: string[];
}
```

**Available Features:**

| Feature | Community | Professional | Enterprise |
|---------|-----------|--------------|------------|
| `static_governance` | ✅ | ✅ | ✅ |
| `kinetic_governance` | ✅ | ✅ | ✅ |
| `kill_switch` | ❌ | ✅ | ✅ |
| `capability_decay` | ❌ | ✅ | ✅ |
| `multi_jurisdiction` | ❌ | ✅ | ✅ |
| `priority_support` | ❌ | ✅ | ✅ |
| `sso_integration` | ❌ | ❌ | ✅ |
| `custom_policies` | ❌ | ❌ | ✅ |
| `audit_export` | ❌ | ❌ | ✅ |
| `sla_guarantee` | ❌ | ❌ | ✅ |

#### 3.2.3 Limits

```typescript
interface LimitsClaim {
  limits: {
    /** Maximum concurrent agent instances */
    agents: number | null;  // null = unlimited
    
    /** Maximum Asset Cards */
    assets: number | null;
    
    /** Maximum licensed users */
    users: number | null;
    
    /** Maximum repositories */
    repositories: number | null;
    
    /** Monthly API calls (for cloud features) */
    api_calls_per_month: number | null;
  };
}
```

**Default Limits by Tier:**

| Limit | Community | Professional | Enterprise |
|-------|-----------|--------------|------------|
| `agents` | 10 | 100 | unlimited |
| `assets` | 50 | 500 | unlimited |
| `users` | 5 | 25 | unlimited |
| `repositories` | 3 | 20 | unlimited |
| `api_calls_per_month` | 10,000 | 100,000 | unlimited |

#### 3.2.4 Organization

```typescript
interface OrganizationClaim {
  organization: {
    /** Organization ID */
    id: string;
    
    /** Organization name */
    name: string;
    
    /** Primary contact email */
    contact_email: string;
    
    /** Allowed domains for SSO */
    allowed_domains?: string[];
  };
}
```

### 3.3 Complete Payload Example

```json
{
  "iss": "https://license.aigos.dev",
  "sub": "org-acme-corp",
  "aud": "aigrc",
  "exp": 1735689600,
  "iat": 1704067200,
  "nbf": 1704067200,
  "jti": "lic-12345678-abcd-efgh",
  
  "tier": "professional",
  
  "features": [
    "static_governance",
    "kinetic_governance",
    "kill_switch",
    "capability_decay",
    "multi_jurisdiction",
    "priority_support"
  ],
  
  "limits": {
    "agents": 100,
    "assets": 500,
    "users": 25,
    "repositories": 20,
    "api_calls_per_month": 100000
  },
  
  "organization": {
    "id": "org-acme-corp",
    "name": "Acme Corporation",
    "contact_email": "admin@acme.com"
  }
}
```

---

## 4. Validation

### 4.1 Validation Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           LICENSE VALIDATION FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. PARSE JWT                                                                          │
│      │                                                                                  │
│      ├── Split into header.payload.signature                                            │
│      ├── Base64URL decode each part                                                     │
│      └── Parse JSON                                                                     │
│      │                                                                                  │
│      │  If malformed → INVALID: "Malformed license key"                                 │
│      │                                                                                  │
│      ▼                                                                                  │
│   2. VERIFY SIGNATURE                                                                   │
│      │                                                                                  │
│      ├── Get key ID from header.kid                                                     │
│      ├── Load public key for key ID                                                     │
│      └── Verify signature over header.payload                                           │
│      │                                                                                  │
│      │  If invalid signature → INVALID: "License signature invalid"                     │
│      │                                                                                  │
│      ▼                                                                                  │
│   3. CHECK ISSUER                                                                       │
│      │                                                                                  │
│      └── Verify iss == "https://license.aigos.dev"                                      │
│      │                                                                                  │
│      │  If wrong issuer → INVALID: "Unknown license issuer"                             │
│      │                                                                                  │
│      ▼                                                                                  │
│   4. CHECK AUDIENCE                                                                     │
│      │                                                                                  │
│      └── Verify aud == "aigrc"                                                          │
│      │                                                                                  │
│      │  If wrong audience → INVALID: "License not for this product"                     │
│      │                                                                                  │
│      ▼                                                                                  │
│   5. CHECK EXPIRATION                                                                   │
│      │                                                                                  │
│      ├── If now > exp + grace_period → EXPIRED                                          │
│      ├── If now > exp → GRACE_PERIOD                                                    │
│      └── If now < nbf → NOT_YET_VALID                                                   │
│      │                                                                                  │
│      ▼                                                                                  │
│   6. (OPTIONAL) ONLINE REVOCATION CHECK                                                 │
│      │                                                                                  │
│      ├── If online, check revocation list                                               │
│      └── If offline, skip (trust local validation)                                      │
│      │                                                                                  │
│      ▼                                                                                  │
│   7. RETURN VALID + CLAIMS                                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Reference Implementation

```typescript
import * as jwt from 'jsonwebtoken';

interface LicenseValidationResult {
  valid: boolean;
  status: 'VALID' | 'EXPIRED' | 'GRACE_PERIOD' | 'INVALID' | 'NOT_YET_VALID';
  claims?: LicenseClaims;
  error?: string;
  days_until_expiration?: number;
  grace_period_remaining?: number;
}

const ISSUER = 'https://license.aigos.dev';
const AUDIENCE = 'aigrc';
const GRACE_PERIOD_DAYS = 14;

function validateLicense(
  licenseKey: string,
  publicKeys: Map<string, string>
): LicenseValidationResult {
  try {
    // 1. Decode header to get key ID
    const [headerB64] = licenseKey.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    
    // 2. Get public key
    const publicKey = publicKeys.get(header.kid);
    if (!publicKey) {
      return { valid: false, status: 'INVALID', error: 'Unknown signing key' };
    }
    
    // 3. Verify and decode
    const claims = jwt.verify(licenseKey, publicKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['RS256', 'ES256'],
    }) as LicenseClaims;
    
    // 4. Check expiration with grace period
    const now = Math.floor(Date.now() / 1000);
    const gracePeriodEnd = claims.exp + (GRACE_PERIOD_DAYS * 24 * 60 * 60);
    
    if (now > gracePeriodEnd) {
      return {
        valid: false,
        status: 'EXPIRED',
        error: 'License expired beyond grace period',
        claims,
      };
    }
    
    if (now > claims.exp) {
      const graceDaysRemaining = Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60));
      return {
        valid: true,  // Still valid during grace period
        status: 'GRACE_PERIOD',
        claims,
        grace_period_remaining: graceDaysRemaining,
      };
    }
    
    const daysUntilExpiration = Math.ceil((claims.exp - now) / (24 * 60 * 60));
    
    return {
      valid: true,
      status: 'VALID',
      claims,
      days_until_expiration: daysUntilExpiration,
    };
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, status: 'INVALID', error: error.message };
    }
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, status: 'EXPIRED', error: 'License expired' };
    }
    if (error instanceof jwt.NotBeforeError) {
      return { valid: false, status: 'NOT_YET_VALID', error: 'License not yet valid' };
    }
    throw error;
  }
}
```

### 4.3 Python Implementation

```python
import jwt
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional, Dict, Any, Literal

ISSUER = 'https://license.aigos.dev'
AUDIENCE = 'aigrc'
GRACE_PERIOD_DAYS = 14

@dataclass
class LicenseValidationResult:
    valid: bool
    status: Literal['VALID', 'EXPIRED', 'GRACE_PERIOD', 'INVALID', 'NOT_YET_VALID']
    claims: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    days_until_expiration: Optional[int] = None
    grace_period_remaining: Optional[int] = None

def validate_license(
    license_key: str,
    public_keys: Dict[str, str]
) -> LicenseValidationResult:
    try:
        # Decode header to get key ID
        header = jwt.get_unverified_header(license_key)
        kid = header.get('kid')
        
        public_key = public_keys.get(kid)
        if not public_key:
            return LicenseValidationResult(
                valid=False,
                status='INVALID',
                error='Unknown signing key'
            )
        
        # Verify and decode
        claims = jwt.decode(
            license_key,
            public_key,
            algorithms=['RS256', 'ES256'],
            issuer=ISSUER,
            audience=AUDIENCE,
        )
        
        # Check expiration with grace period
        now = datetime.utcnow().timestamp()
        exp = claims['exp']
        grace_period_end = exp + (GRACE_PERIOD_DAYS * 24 * 60 * 60)
        
        if now > grace_period_end:
            return LicenseValidationResult(
                valid=False,
                status='EXPIRED',
                error='License expired beyond grace period',
                claims=claims,
            )
        
        if now > exp:
            grace_days = int((grace_period_end - now) / (24 * 60 * 60)) + 1
            return LicenseValidationResult(
                valid=True,
                status='GRACE_PERIOD',
                claims=claims,
                grace_period_remaining=grace_days,
            )
        
        days_until = int((exp - now) / (24 * 60 * 60)) + 1
        
        return LicenseValidationResult(
            valid=True,
            status='VALID',
            claims=claims,
            days_until_expiration=days_until,
        )
        
    except jwt.InvalidSignatureError:
        return LicenseValidationResult(
            valid=False, status='INVALID', error='Invalid signature'
        )
    except jwt.ExpiredSignatureError:
        return LicenseValidationResult(
            valid=False, status='EXPIRED', error='License expired'
        )
    except jwt.ImmatureSignatureError:
        return LicenseValidationResult(
            valid=False, status='NOT_YET_VALID', error='License not yet valid'
        )
    except jwt.InvalidTokenError as e:
        return LicenseValidationResult(
            valid=False, status='INVALID', error=str(e)
        )
```

---

## 5. Feature Gating

### 5.1 Feature Check

```typescript
function hasFeature(
  claims: LicenseClaims,
  feature: string
): boolean {
  // Community tier has basic features enabled by default
  const communityFeatures = ['static_governance', 'kinetic_governance'];
  
  if (claims.tier === 'community' && communityFeatures.includes(feature)) {
    return true;
  }
  
  return claims.features.includes(feature);
}

// Usage
if (!hasFeature(license.claims, 'kill_switch')) {
  throw new FeatureNotAvailableError(
    'Kill Switch requires Professional or Enterprise tier',
    'kill_switch'
  );
}
```

### 5.2 Limit Check

```typescript
function checkLimit(
  claims: LicenseClaims,
  limit: keyof LicenseClaims['limits'],
  currentUsage: number
): LimitCheckResult {
  const maxAllowed = claims.limits[limit];
  
  // null = unlimited
  if (maxAllowed === null) {
    return { allowed: true, remaining: Infinity };
  }
  
  const remaining = maxAllowed - currentUsage;
  
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      error: `${limit} limit reached (${maxAllowed})`,
    };
  }
  
  // Warn at 80%
  if (remaining < maxAllowed * 0.2) {
    return {
      allowed: true,
      remaining,
      warning: `Approaching ${limit} limit (${currentUsage}/${maxAllowed})`,
    };
  }
  
  return { allowed: true, remaining };
}
```

---

## 6. Key Rotation

### 6.1 Key ID (kid)

Keys are identified by `kid` in the JWT header:

```
kid format: key-YYYY-MM

Examples:
  key-2025-01
  key-2025-07
  key-2026-01
```

### 6.2 Public Key Distribution

Public keys are:

1. **Embedded in SDK** — Default keys bundled with release
2. **Fetched from JWKS** — Dynamic keys from `https://license.aigos.dev/.well-known/jwks.json`

```json
// JWKS format
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-2025-01",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "kid": "key-2025-07",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 6.3 Rotation Schedule

- New keys generated every 6 months
- Old keys remain valid for 12 months after rotation
- Licenses issued with old keys remain valid until expiration

---

## 7. Storage

### 7.1 Configuration

```yaml
# .aigrc.yaml
license:
  # Option 1: Inline key
  key: "eyJhbGciOiJSUzI1NiIs..."
  
  # Option 2: File path
  # key_file: ".aigrc/license.key"
  
  # Option 3: Environment variable (default)
  # Uses AIGRC_LICENSE_KEY if neither above is set
```

### 7.2 File Storage

```
# .aigrc/license.key
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0yMDI1LTAxIn0.eyJpc3MiOiJodHRwczovL2xpY2Vuc2UuYWlnb3MuZGV2Ii...
```

### 7.3 .gitignore

License keys SHOULD be gitignored:

```gitignore
# .gitignore
.aigrc/license.key
```

---

## 8. Behavior

### 8.1 No License

When no license is present:

1. Assume Community tier
2. Enable community features
3. Apply community limits
4. Log info message

```typescript
if (!licenseKey) {
  logger.info('No license key found, using Community tier');
  return {
    tier: 'community',
    features: ['static_governance', 'kinetic_governance'],
    limits: COMMUNITY_LIMITS,
  };
}
```

### 8.2 Grace Period

When license is in grace period:

1. All features remain enabled
2. Log warning daily
3. Show warning in CLI output
4. Send telemetry (if enabled)

```typescript
if (result.status === 'GRACE_PERIOD') {
  logger.warn(
    `License expired, ${result.grace_period_remaining} days remaining in grace period`
  );
  // Continue with full functionality
}
```

### 8.3 Expired License

When license is fully expired (beyond grace period):

1. Fall back to Community tier
2. Disable paid features
3. Log error
4. Show clear upgrade message

```typescript
if (result.status === 'EXPIRED') {
  logger.error('License expired, falling back to Community tier');
  logger.error('Visit https://aigos.dev/pricing to renew');
  return COMMUNITY_LICENSE;
}
```

---

## 9. Security Considerations

### 9.1 Key Storage

- **DO**: Store license key in environment variable or file
- **DO**: Gitignore license key files
- **DON'T**: Commit license keys to public repositories
- **DON'T**: Share license keys across organizations

### 9.2 Signature Verification

- Always verify signature before trusting claims
- Use RS256 or ES256 (no HS256 for license keys)
- Validate issuer and audience claims

### 9.3 Clock Skew

Allow reasonable clock skew (default: 5 minutes):

```typescript
jwt.verify(token, publicKey, {
  clockTolerance: 300,  // 5 minutes
});
```

---

## 10. Implementation Requirements

### 10.1 MUST (Required)

Implementations MUST:

1. Validate JWT signature before trusting claims
2. Check `iss` and `aud` claims
3. Implement grace period (14 days default)
4. Fall back to Community tier on invalid license
5. Support RS256 and ES256 algorithms

### 10.2 SHOULD (Recommended)

Implementations SHOULD:

1. Cache validated license claims
2. Support key rotation via JWKS
3. Warn before license expiration
4. Log license status on startup

### 10.3 MAY (Optional)

Implementations MAY:

1. Implement online revocation checking
2. Support license metering/usage reporting
3. Implement license migration tools

---

## 11. Examples

### 11.1 Generate License (Server-Side)

```typescript
import * as jwt from 'jsonwebtoken';

function generateLicense(
  organizationId: string,
  tier: 'professional' | 'enterprise',
  expirationDate: Date,
  privateKey: string
): string {
  const features = tier === 'enterprise'
    ? ENTERPRISE_FEATURES
    : PROFESSIONAL_FEATURES;
  
  const limits = tier === 'enterprise'
    ? ENTERPRISE_LIMITS
    : PROFESSIONAL_LIMITS;
  
  const payload = {
    iss: 'https://license.aigos.dev',
    sub: organizationId,
    aud: 'aigrc',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expirationDate.getTime() / 1000),
    jti: `lic-${crypto.randomUUID()}`,
    tier,
    features,
    limits,
    organization: {
      id: organizationId,
      name: 'Acme Corp',
      contact_email: 'admin@acme.com',
    },
  };
  
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: { kid: 'key-2025-01' },
  });
}
```

### 11.2 Validate License (Client-Side)

```typescript
const result = validateLicense(process.env.AIGRC_LICENSE_KEY, publicKeys);

if (!result.valid) {
  console.error(`License invalid: ${result.error}`);
  console.log('Using Community tier');
} else {
  console.log(`License valid: ${result.claims.tier} tier`);
  console.log(`Expires in ${result.days_until_expiration} days`);
  console.log(`Features: ${result.claims.features.join(', ')}`);
}
```

---

## Appendix A: JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/license-claims.json",
  "title": "AIGRC License Claims",
  "type": "object",
  "required": ["iss", "sub", "aud", "exp", "iat", "jti", "tier", "features", "limits"],
  "properties": {
    "iss": { "type": "string", "const": "https://license.aigos.dev" },
    "sub": { "type": "string" },
    "aud": { "type": "string", "const": "aigrc" },
    "exp": { "type": "integer" },
    "iat": { "type": "integer" },
    "nbf": { "type": "integer" },
    "jti": { "type": "string" },
    "tier": { "type": "string", "enum": ["community", "professional", "enterprise"] },
    "features": { "type": "array", "items": { "type": "string" } },
    "limits": {
      "type": "object",
      "properties": {
        "agents": { "type": ["integer", "null"] },
        "assets": { "type": ["integer", "null"] },
        "users": { "type": ["integer", "null"] },
        "repositories": { "type": ["integer", "null"] },
        "api_calls_per_month": { "type": ["integer", "null"] }
      }
    },
    "organization": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "contact_email": { "type": "string", "format": "email" },
        "allowed_domains": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
