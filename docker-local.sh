#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

compose() {
  (cd "$ROOT_DIR" && docker compose "$@")
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is not installed or not on PATH."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Error: docker daemon is not running."
    exit 1
  fi
}

usage() {
  cat <<'EOF'
Usage: ./docker-local.sh <command> [args]

Commands:
  up [--build] [service...]        Start services in detached mode
  down [--volumes]                 Stop and remove services
  restart [service...]             Restart all or specific services
  ps                               Show compose service status
  logs [service]                   Stream logs (all or one service)
  build [service...]               Build images
  pull [service...]                Pull images
  migrate                          Run backend alembic upgrade head
  backend-shell                    Open shell in backend container
  frontend-shell                   Open shell in frontend container
  backend-cmd <cmd...>             Run command inside backend container
  frontend-cmd <cmd...>            Run command inside frontend container
  clean                            Down + remove volumes + remove orphans
  recreate                         Rebuild and force recreate services
  help                             Show this help

Examples:
  ./docker-local.sh up --build
  ./docker-local.sh logs backend
  ./docker-local.sh migrate
  ./docker-local.sh restart frontend
EOF
}

main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    up)
      require_docker
      compose up -d "$@"
      ;;
    down)
      require_docker
      compose down "$@"
      ;;
    restart)
      require_docker
      compose restart "$@"
      ;;
    ps)
      require_docker
      compose ps
      ;;
    logs)
      require_docker
      if [ "$#" -gt 0 ]; then
        compose logs -f --tail=200 "$1"
      else
        compose logs -f --tail=200
      fi
      ;;
    build)
      require_docker
      compose build "$@"
      ;;
    pull)
      require_docker
      compose pull "$@"
      ;;
    migrate)
      require_docker
      compose exec backend alembic upgrade head
      ;;
    backend-shell)
      require_docker
      compose exec backend bash
      ;;
    frontend-shell)
      require_docker
      compose exec frontend sh
      ;;
    backend-cmd)
      require_docker
      if [ "$#" -eq 0 ]; then
        echo "Error: backend-cmd requires a command."
        exit 1
      fi
      compose exec backend "$@"
      ;;
    frontend-cmd)
      require_docker
      if [ "$#" -eq 0 ]; then
        echo "Error: frontend-cmd requires a command."
        exit 1
      fi
      compose exec frontend "$@"
      ;;
    clean)
      require_docker
      compose down --volumes --remove-orphans
      ;;
    recreate)
      require_docker
      compose up -d --build --force-recreate
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "Unknown command: $cmd"
      echo
      usage
      exit 1
      ;;
  esac
}

main "$@"
