#!/usr/bin/env bash
#
# Server-side deploy for survey.kortexd.com.
#
# Run on the host, from /opt/survey, after the new source is in place:
#
#     ssh root@<host> 'bash /opt/survey/scripts/deploy/deploy.sh'
#
# Source is shipped as a tarball rather than pulled, so the box needs no deploy
# key. From a working copy:
#
#     tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env \
#         -czf /tmp/survey-src.tgz . \
#       && scp /tmp/survey-src.tgz root@<host>:/tmp/ \
#       && ssh root@<host> 'cd /opt/survey \
#            && rm -rf src scripts prisma content public \
#            && tar -xzf /tmp/survey-src.tgz -C /opt/survey \
#            && bash /opt/survey/scripts/deploy/deploy.sh'
#
# The `rm -rf` matters: tar overwrites and adds but never deletes, so without it
# a file deleted from the repo lives on at /opt/survey for ever and keeps being
# compiled. It only clears trees that come from the tarball.
#
# /opt/survey/.env is never part of the tarball and is left untouched.

set -euo pipefail

APP_DIR=/opt/survey
cd "$APP_DIR"

echo "==> loading environment"
set -a
# shellcheck disable=SC1091
. "$APP_DIR/.env"
set +a

echo "==> installing dependencies"
# --include=dev is explicit: tailwind, typescript, tsx and the Prisma CLI are
# devDependencies and are all needed to build; npm would skip them if NODE_ENV
# were production.
npm ci --include=dev --no-audit --no-fund

echo "==> verifying the questionnaire against the locked source"
# Refuses to deploy if any of the 27 questions has drifted from Inas's original.
npx tsx scripts/verify-content.ts

echo "==> applying database migrations"
npx prisma migrate deploy

echo "==> generating the Prisma client"
npx prisma generate

echo "==> building"
# NODE_ENV is deliberately left unset here. `next build` sets it to production
# on its own, and exporting it up front makes Turbopack fail to resolve the
# PostCSS plugin. The runtime gets NODE_ENV=production from the systemd unit.
rm -rf .next
npx next build

echo "==> assembling the standalone bundle"
# Next traces a minimal server into .next/standalone but does not copy the
# static assets or public files into it; that is left to the deployer.
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public
mkdir -p .next/standalone/.next/cache

echo "==> fixing ownership"
chown -R root:www-data "$APP_DIR"
chmod 640 "$APP_DIR/.env"
chown -R www-data:www-data "$APP_DIR/.next/standalone/.next/cache"

echo "==> restarting"
systemctl restart survey
sleep 3
systemctl is-active survey

echo "==> smoke test"
curl -fsS -o /dev/null -w "local app: %{http_code}\n" http://127.0.0.1:3020/
curl -fsS -o /dev/null -w "public:    %{http_code}\n" https://survey.kortexd.com/

echo "==> done"
