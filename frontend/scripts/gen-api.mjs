// Generuje src/api/schema.d.ts z OpenAPI działającego backendu.
// Lokalnie: backend na http://localhost:8000. W Dockerze: API_PROXY_TARGET=http://backend:8000.
import { execSync } from 'node:child_process'

const base = process.env.API_PROXY_TARGET ?? 'http://localhost:8000'
execSync(`npx -y openapi-typescript@7 ${base}/openapi.json -o src/api/schema.d.ts`, {
  stdio: 'inherit',
})
