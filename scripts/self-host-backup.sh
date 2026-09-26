#!/bin/sh
set -eu
umask 077

case "${1:-}" in
  backup|restore) action=$1 ;;
  *) echo "Usage: sh scripts/self-host-backup.sh backup|restore /absolute/backup-directory" >&2; exit 1 ;;
esac
case "${2:-}" in
  /*) archive=$2 ;;
  *) echo "Use an absolute backup directory outside the checkout." >&2; exit 1 ;;
esac
if [ -d "$archive" ]; then
  archive=$(cd "$archive" && pwd -P)
else
  archive="$(cd "$(dirname "$archive")" && pwd -P)/$(basename "$archive")"
fi
cd "$(dirname "$0")/.."
checkout=$(pwd -P)
case "$archive/" in
  "$checkout/"*) echo "Keep backups outside the checkout." >&2; exit 1 ;;
esac
project=${COMPOSE_PROJECT_NAME:-mana-selfhost}
helper=postgres:16.15-alpine3.24
compose() { docker compose --env-file .env.selfhost -f compose.selfhost.yml "$@"; }
docker info >/dev/null

if [ "$action" = backup ]; then
  test -f .env.selfhost
  for service in db storage mail; do
    test -n "$(compose ps -q "$service")" || {
      echo "Start this installation before taking a backup: $service is not running." >&2
      exit 1
    }
  done
  mkdir "$archive"
  cp .env.selfhost "$archive/.env.selfhost"
  if [ -f .env.selfhost.integrations ]; then
    cp .env.selfhost.integrations "$archive/.env.selfhost.integrations"
  fi
  cp compose.selfhost.yml "$archive/compose.selfhost.yml"
  docker inspect --format '{{.Config.Image}} {{.Image}}' "$(compose ps -q db)" > "$archive/database-image.txt"
  # Stopping all writers keeps the database and uploaded objects at the same point.
  trap 'compose up --no-build --wait --wait-timeout 180' EXIT
  trap 'exit 1' HUP INT TERM
  compose stop
  for service in db storage mail; do
    container=$(compose ps -a -q "$service")
    directory=/data
    if [ "$service" = db ]; then directory=/var/lib/postgresql/data; fi
    docker run --rm --volumes-from "$container:ro" "$helper" \
      tar -C "$directory" -czf - . > "$archive/$service.tar.gz"
  done
  docker run --rm --mount "type=bind,source=$archive,target=/backup,readonly" \
    --workdir /backup "$helper" sh -c 'sha256sum .env.selfhost compose.selfhost.yml database-image.txt *.tar.gz; if [ -f .env.selfhost.integrations ]; then sha256sum .env.selfhost.integrations; fi' > "$archive/SHA256SUMS"
  touch "$archive/complete"
  compose up --no-build --wait --wait-timeout 180
  trap - EXIT HUP INT TERM
  echo "Backup complete: $archive. It includes secrets and account data; store it privately."
else
  test -f "$archive/complete" || { echo "Backup is incomplete." >&2; exit 1; }
  test ! -e .env.selfhost || { echo "Restore requires a clean checkout without .env.selfhost." >&2; exit 1; }
  test -z "$(docker ps -aq --filter "label=com.docker.compose.project=$project")" || {
    echo "Restore refuses to overwrite existing project containers: $project" >&2; exit 1;
  }
  test -z "$(docker volume ls -q --filter "label=com.docker.compose.project=$project")" || {
    echo "Restore refuses to overwrite existing project volumes: $project" >&2; exit 1;
  }
  cmp -s compose.selfhost.yml "$archive/compose.selfhost.yml" || {
    echo "Restore using the same source version and Compose file as the backup; upgrade afterward." >&2; exit 1;
  }
  docker run --rm --mount "type=bind,source=$archive,target=/backup,readonly" \
    --workdir /backup "$helper" sha256sum -c SHA256SUMS
  cp "$archive/.env.selfhost" .env.selfhost
  if [ -f "$archive/.env.selfhost.integrations" ]; then
    cp "$archive/.env.selfhost.integrations" .env.selfhost.integrations
  fi
  compose create db storage mail
  expected=$(cut -d ' ' -f 2 "$archive/database-image.txt")
  actual=$(docker inspect --format '{{.Image}}' "$(compose ps -a -q db)")
  test "$expected" = "$actual" || {
    echo "Database image differs from the backup. Restore needs the same image and architecture." >&2; exit 1;
  }
  for service in db storage mail; do
    container=$(compose ps -a -q "$service")
    directory=/data
    if [ "$service" = db ]; then directory=/var/lib/postgresql/data; fi
    docker run --rm -i --volumes-from "$container" "$helper" \
      tar -C "$directory" -xzf - < "$archive/$service.tar.gz"
  done
  echo "Restored into stopped containers for $project. Run sh scripts/self-host.sh, then verify your records and files."
fi
