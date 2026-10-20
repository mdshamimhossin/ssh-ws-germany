FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssh-server ca-certificates && rm -rf /var/lib/apt/lists/* \
 && useradd -m -s /bin/bash tunnel && mkdir -p /run/sshd /home/tunnel/.ssh \
 && chown -R tunnel:tunnel /home/tunnel/.ssh && chmod 700 /home/tunnel/.ssh
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js start.sh ./
RUN chmod +x start.sh && printf '\nPasswordAuthentication no\nPermitRootLogin no\nAllowTcpForwarding yes\n' >> /etc/ssh/sshd_config
ENV PORT=8080
EXPOSE 8080
CMD ["/app/start.sh"]
