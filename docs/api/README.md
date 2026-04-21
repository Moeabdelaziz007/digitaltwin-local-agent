# API Contract Governance

This directory contains the authoritative OpenAPI specifications and examples for the Digital Twin platform.

## Workflow: APIdog <-> Git

1. **Design**: Use APIdog to design new endpoints, define schemas, and create mock responses.
2. **Review**: Discuss changes in APIdog with the team.
3. **Export**: Once a contract is stable, export it as an OpenAPI 3.1 YAML file.
4. **Sync**: Commit the exported YAML to `contracts/openapi/`.
5. **Version**: Git remains the source of truth for reviewed and approved contracts.

## Directory Structure

- `contracts/openapi/`: YAML specifications for each API domain.
- `contracts/examples/`: Curated JSON examples for request/response payloads.
- `docs/api/`: Guides and workflow documentation.

## Mocking

During development, point your frontend/client base URL to the APIdog Mock URL to iterate rapidly without a live backend.

```env
# Example .env.local for Mocking
NEXT_PUBLIC_ADMIN_API_URL=https://mock.apidog.com/m1/12345/api/admin
```
