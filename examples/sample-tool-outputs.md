# Sample Tool Outputs

## Tool: `ua_precheck`
*(Note: Output is illustrative and simplified; the real tool returns plain text content, not structured JSON).*
**Input:**
```json
{
  "target": "src/auth/service.ts"
}
```

**Output:**
```json
{
  "status": "blocked",
  "blast_radius": 14,
  "affected_files": [
    "src/user/controller.ts",
    "src/payment/processor.ts",
    "src/api/routes.ts"
  ],
  "message": "Modification blocked. This file has a large blast radius and is protected by rule 'protect-auth'. Please ask the user for explicit confirmation before proceeding."
}
```

## Tool: `ua_rules`
*(Note: Output is illustrative and simplified; the real tool returns plain text content, not structured JSON).*
**Input:**
```json
{}
```

**Output:**
```json
{
  "active_rules": [
    {
      "id": "protect-auth",
      "description": "Auth module is highly sensitive. Do not modify without explicit user approval.",
      "pattern": "src/auth/**/*",
      "severity": "error",
      "type": "block"
    },
    {
      "id": "warn-db-migrations",
      "description": "Database migrations require careful review.",
      "pattern": "prisma/migrations/**/*",
      "severity": "warning",
      "type": "warn"
    }
  ]
}
```
