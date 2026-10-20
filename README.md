# SSH over WebSocket on Cloud Run (Frankfurt)

A standard RFC 6455 WebSocket-to-OpenSSH bridge. The WebSocket path is `/` and health endpoint is `/health`.

## IMPORTANT client requirements

Your client must send a **valid WebSocket handshake** including `Host: <service>.run.app`, `Sec-WebSocket-Key` (random per connection), and `Sec-WebSocket-Version: 13`, and must **frame SSH bytes as WebSocket binary messages**. A plain HTTP Injector raw `GET / ... Upgrade: websocket` payload with an empty Host and no WebSocket framing is **not compatible**. Use a real WebSocket-capable SSH client.

## Setup

1. Create a GitHub repo and upload these files.
2. Generate an SSH key pair on your device and retain the private key securely. Put the public key in Secret Manager as `ssh-ws-germany-pubkey` (single-line `ssh-ed25519 ...`).
3. Connect the GitHub repo using Cloud Run Console > Create service > Continuously deploy from repository (Cloud Build) or deploy with `gcloud run deploy --source .` from a checked-out GitHub repo.
4. Set region `europe-west3`, service name `ssh-ws-germany`, authentication `Allow unauthenticated invocations` (SSH still authenticates with the key), container port 8080, timeout 3600 seconds, and HTTP/2 end-to-end OFF.
5. Mount secret `ssh-ws-germany-pubkey` as environment variable `SSH_AUTHORIZED_KEY`. Give the Cloud Run runtime service account Secret Manager Secret Accessor permission on that secret.
6. Verify `https://SERVICE.run.app/health` returns `ok` and test `wss://SERVICE.run.app/` using a proper WebSocket client with SSH user `tunnel` and your private key.

## Notes

- Cloud Run terminates HTTPS; the container uses plain HTTP on port 8080.
- Cloud Run WebSocket connections time out after at most 60 minutes; clients must reconnect.
- Cloud Run instances are ephemeral, so SSH host keys generated at startup change on instance replacement. For production, persist host keys securely via Secret Manager and load them at startup.
- SSH TCP forwarding from the container may be subject to Cloud Run networking and billing restrictions. Validate your intended traffic and costs.
- Existing Cloud Run services are not modified by creating this service.
