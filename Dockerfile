# Repeatable Node tooling image for the BDZ train companion app.
#
# SCOPE (verified in this repository's README "Docker scope and limits"):
#   - dependency installation (npm ci), typecheck, lint, jest tests
#   - the Expo/Metro dev server (port 8081), reachable from the host
# NOT IN SCOPE — do not expect these to work here:
#   - iOS builds or the iOS Simulator (require macOS + Xcode or EAS Build)
#   - Android emulator UI / interactive device testing
#   - production deployment of any kind
#
# Node image: pinned to the current Node LTS line (24.x, "Krypton") as
# verified on https://nodejs.org/dist/index.json on 2026-10-22. The host
# machine runs Node 26.7.0 ("Current", not LTS at that date); both satisfy
# expo@58's engines (^22.13 || ^24.3 || ^26.0).

FROM node:24-bookworm-slim

WORKDIR /app

# Install dependencies reproducibly from the committed lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Least privilege (security review F-06): run tooling as the base image's
# unprivileged `node` user; only the app tree's ownership changes.
RUN chown -R node:node /app
USER node

EXPOSE 8081

# --host lan is the default and binds the dev server on all interfaces so the
# port can be published to the host. CI must stay unset/false here: Expo turns
# off file watching and Fast Refresh when CI=1.
CMD ["npm", "start", "--", "--port", "8081"]
