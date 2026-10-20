#!/bin/sh
set -eu
if [ -z "${SSH_AUTHORIZED_KEY:-}" ]; then
  echo 'SSH_AUTHORIZED_KEY must be supplied as a Cloud Run secret/environment variable' >&2
  exit 1
fi
printf '%s\n' "$SSH_AUTHORIZED_KEY" > /home/tunnel/.ssh/authorized_keys
chown tunnel:tunnel /home/tunnel/.ssh/authorized_keys
chmod 600 /home/tunnel/.ssh/authorized_keys
ssh-keygen -A >/dev/null
/usr/sbin/sshd
exec node /app/server.js
