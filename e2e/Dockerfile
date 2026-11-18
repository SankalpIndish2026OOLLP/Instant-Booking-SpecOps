# syntax=docker/dockerfile:1
# Build context: repository root. Playwright's test runner needs Node, which this pinned image provides,
# so the host only needs Bun and Docker.
FROM mcr.microsoft.com/playwright:v1.65.1-noble
WORKDIR /work/e2e
COPY --chown=pwuser:pwuser e2e/package.json ./
RUN chown pwuser:pwuser /work /work/e2e
USER pwuser
RUN npm install --no-audit --no-fund
COPY --chown=pwuser:pwuser client/src/strings /work/client/src/strings
COPY --chown=pwuser:pwuser e2e/ ./
CMD ["npm", "test"]
