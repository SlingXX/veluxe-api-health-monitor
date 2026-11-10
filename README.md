Monitor HTTP(S) endpoints, see recent uptime and latency, and view a responsive live dashboard. No external dependencies, no SaaS account, no API key required.

Requirements
Node.js 20+

Quick start
cp config.example.json config.json
# Edit config.json to add your endpoints
npm start
Open http://localhost:3000.

Windows PowerShell: Copy-Item config.example.json config.json.

Configuration
port: listening port (also supports PORT environment variable)
intervalSeconds: monitoring interval (minimum 10 seconds)
timeoutMs: per-request timeout
retention: maximum samples kept per endpoint in memory
targets: name, URL, expected HTTP status (defaults to 200)
Optional VELUXE_CONFIG environment variable specifies an alternate config path.

JSON API
GET /api/status returns all configured endpoints, their most recent checks, observed uptime, and up to 60 recent samples.

Deployment notes
Run as a persistent Node.js process (e.g., a small VPS or always-on Node hosting). This is not a static Netlify deployment and does not work as an always-on checker on serverless-only hosting. Monitoring history is held in memory and resets on restart. Uptime represents only the checks observed since process start, not a guaranteed SLA.

Security: Treat this as a trusted-admin dashboard. It has no authentication. Do not publicly expose it if endpoint URLs or status information are sensitive. Configure only URLs you own or are authorized to monitor. Public dashboard access also exposes configured endpoint URLs.

Roadmap
Persistent SQLite history
Email/webhook alerts
Authentication
Multi-region probes
Status pages
License
MIT — Copyright (c) 2026 Veluxe Digital. See LICENSE.
