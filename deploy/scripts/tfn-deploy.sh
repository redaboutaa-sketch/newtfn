#!/usr/bin/env bash
# Déploiement Tech Formation Nord — réservé à l'administrateur (root). Ne jamais l'exposer au développeur.
# Copie de référence versionnée ; la copie exécutée est /usr/local/sbin/tfn-deploy (root:root 0750),
# réinstallée uniquement après relecture :  install -o root -g root -m 0750 deploy/scripts/tfn-deploy.sh /usr/local/sbin/tfn-deploy
#
# Usage :
#   tfn-deploy preprod    <branche|commit> [--dry-run] [--approve-infra]
#   tfn-deploy production <commit>         [--dry-run] [--approve-infra]
#   tfn-deploy rollback   preprod|production <commit>
#   tfn-deploy status
#
# Garde-fous :
# - build dans un worktree Git temporaire à partir d'un commit présent sur GitHub (origin) : /opt/newtfn n'est pas modifié ;
# - les fichiers qui décident de ce qui s'exécute sur le VPS (Compose, Dockerfile, .dockerignore, ce script) sont épinglés
#   par empreinte dans /etc/techformanord/deploy-reviewed.sha256 : toute modification bloque le déploiement tant qu'un
#   administrateur ne l'a pas relue et approuvée (--approve-infra) ;
# - production : commit présent sur la branche de production, déjà en préproduction, confirmation tapée du commit ;
# - image candidate testée sur un port local avant remplacement ; image précédente étiquetée <env>-rollback.
set -euo pipefail
SRC=

REPO=/opt/newtfn
CONF_DIR=/etc/techformanord
PINS=$CONF_DIR/deploy-reviewed.sha256
WORK=/var/lib/tfn-deploy
LOG=/var/log/tfn-deploy.log
# Branche dont doivent provenir les commits de production (à passer à « main » après fusion des PR).
PROD_BRANCH=${TFN_PROD_BRANCH:-$(cat "$CONF_DIR/prod-branch" 2>/dev/null || echo main)}
PINNED_FILES=(deploy/docker-compose.preprod.yml deploy/docker-compose.preprod.alias.yml deploy/docker-compose.production.yml
  deploy/docker-compose.production.predns.yml site/Dockerfile forms/Dockerfile .dockerignore deploy/scripts/tfn-deploy.sh)

die() { echo "ERREUR : $*" >&2; exit 1; }
log() { echo "$(date -Is) $*" | tee -a "$LOG"; }
[ "$(id -u)" = 0 ] || die "à lancer en root."

env_args() { # $1 = preprod|production ; sortie : options compose
  case $1 in
    preprod) echo "-p tfn-preprod --env-file $CONF_DIR/preprod.env -f deploy/docker-compose.preprod.yml -f deploy/docker-compose.preprod.alias.yml" ;;
    production)
      if [ -f "$CONF_DIR/production.env" ]; then echo "-p tfn-prod --env-file $CONF_DIR/production.env -f deploy/docker-compose.production.yml"
      else echo "-p tfn-prod --env-file $CONF_DIR/production-predns.env -f deploy/docker-compose.production.yml -f deploy/docker-compose.production.predns.yml"; fi ;;
  esac
}
tag_prefix() { [ "$1" = production ] && echo prod || echo preprod; }
public_url() { [ "$1" = production ] && echo https://techformanord.fr || echo https://tfn.iatechformanord.fr; }

wait_healthy() { # $1 = conteneur
  local s=""; for _ in $(seq 1 40); do s=$(docker inspect "$1" --format '{{.State.Health.Status}}' 2>/dev/null || true); [ "$s" = healthy ] && return 0; sleep 5; done
  die "$1 n'est pas « healthy » (état : $s)."
}

check_public_version() { # $1 env, $2 sha court
  local v=""; for _ in $(seq 1 24); do v=$(curl -s --max-time 10 "$(public_url "$1")/version.txt" || true); [ "$v" = "$2" ] && { log "OK $1 sert $2"; return 0; }; sleep 5; done
  die "$(public_url "$1")/version.txt renvoie « $v » au lieu de $2."
}

cmd_status() {
  for e in preprod production; do echo "$e : $(curl -s --max-time 10 "$(public_url $e)/version.txt" || echo '?')"; done
  echo "Branche de production : $PROD_BRANCH"
  docker images tfn-site --format '{{.Tag}}\t{{.CreatedSince}}' | sort
}

cmd_rollback() {
  local env=$1 sha=$2 p; p=$(tag_prefix "$env")
  [[ $env =~ ^(preprod|production)$ ]] || die "environnement inconnu."
  docker image inspect "tfn-site:$p-$sha" >/dev/null 2>&1 || die "image tfn-site:$p-$sha absente."
  docker tag "tfn-site:$p-$sha" "tfn-site:$([ $env = production ] && echo production || echo preprod)"
  docker image inspect "tfn-forms:$p-$sha" >/dev/null 2>&1 && docker tag "tfn-forms:$p-$sha" "tfn-forms:$([ $env = production ] && echo production || echo preprod)"
  local v; v=$(docker run --rm --entrypoint cat "tfn-site:$p-$sha" /usr/share/nginx/html/version.txt 2>/dev/null || echo "?")
  cd "$REPO"
  # shellcheck disable=SC2046
  GIT_COMMIT=$v docker compose $(env_args "$env") up -d --no-build
  wait_healthy "tfn-$([ $env = production ] && echo prod || echo preprod)-web"
  check_public_version "$env" "$v"
  log "ROLLBACK $env -> $sha"
}

cmd_deploy() {
  local env=$1 ref=$2; shift 2
  local dry=0 approve=0
  for a in "$@"; do case $a in --dry-run) dry=1 ;; --approve-infra) approve=1 ;; *) die "option inconnue : $a" ;; esac; done
  [[ $env =~ ^(preprod|production)$ ]] || die "environnement inconnu."
  exec 9>/run/tfn-deploy.lock; flock -n 9 || die "un déploiement est déjà en cours."

  git -C "$REPO" fetch -q --prune origin
  local sha; sha=$(git -C "$REPO" rev-parse --verify -q "origin/$ref^{commit}" || git -C "$REPO" rev-parse --verify -q "$ref^{commit}") || die "référence introuvable : $ref"
  git -C "$REPO" branch -r --contains "$sha" | grep -q . || die "$sha n'est sur aucune branche GitHub (origin) : refus."
  local short; short=$(git -C "$REPO" rev-parse --short=7 "$sha")
  if [ "$env" = production ]; then
    git -C "$REPO" merge-base --is-ancestor "$sha" "origin/$PROD_BRANCH" || die "$short n'est pas sur origin/$PROD_BRANCH : refus."
    local pv; pv=$(curl -s --max-time 10 "$(public_url preprod)/version.txt" || true)
    [ "$pv" = "$short" ] || die "la préproduction sert « $pv », pas $short : déployer et valider d'abord en préproduction."
  fi
  log "DEMANDE $env $short ($(git -C "$REPO" log -1 --format='%an — %s' "$sha"))"

  SRC="$WORK/src-$short-$$"; mkdir -p "$WORK"; local src=$SRC
  git -C "$REPO" worktree add -q --detach "$src" "$sha"
  trap 'git -C "$REPO" worktree remove --force "$SRC" >/dev/null 2>&1 || true; docker rm -f tfn-cand >/dev/null 2>&1 || true' EXIT

  # Épinglage des fichiers d'infrastructure.
  local now f; now=$(cd "$src" && for f in "${PINNED_FILES[@]}"; do if [ -f "$f" ]; then sha256sum "$f"; else echo "absent  $f"; fi; done)
  if ! diff -q <(echo "$now") "$PINS" >/dev/null 2>&1; then
    echo "Fichiers d'infrastructure modifiés depuis la dernière relecture :"
    diff <(cat "$PINS" 2>/dev/null) <(echo "$now") | sed -n 's/^> [^ ]*  /  /p' || true
    echo "Voir : git -C $REPO diff <dernier-commit-relu> $short -- ${PINNED_FILES[*]}"
    [ $approve = 1 ] || die "relire ces fichiers (volumes, privileged, réseaux, ports, labels Traefik, sudo/setuid) puis relancer avec --approve-infra."
    [ $dry = 1 ] || { read -r -p "Tapez « J'AI RELU » pour approuver : " ok; [ "$ok" = "J'AI RELU" ] || die "non approuvé."; echo "$now" > "$PINS"; chmod 600 "$PINS"; log "INFRA approuvée pour $short"; }
  fi

  if [ "$env" = production ] && [ $dry = 0 ]; then
    echo "Mise en PRODUCTION de $short sur https://techformanord.fr"
    read -r -p "Tapez le commit ($short) pour confirmer : " ok; [ "$ok" = "$short" ] || die "confirmation incorrecte."
  fi
  [ $dry = 1 ] && { log "DRY-RUN $env $short : contrôles OK (aucun build, aucun redémarrage)"; return 0; }

  local p name img; p=$(tag_prefix "$env"); name=$([ $env = production ] && echo prod || echo preprod); img=$([ $env = production ] && echo production || echo preprod)
  cd "$src"
  # shellcheck disable=SC2046
  GIT_COMMIT=$short docker compose $(env_args "$env") build
  docker tag "tfn-site:$img" "tfn-site:$p-$short"; docker tag "tfn-forms:$img" "tfn-forms:$p-$short"

  # Test de l'image candidate, hors Traefik, sur un port local.
  docker rm -f tfn-cand >/dev/null 2>&1 || true
  docker run -d --rm --name tfn-cand --network "tfn-$name-internal" -p 127.0.0.1:8098:8080 \
    -e NGINX_ROBOTS_HEADER="$([ $env = production ] && echo '' || echo 'noindex, nofollow')" "tfn-site:$p-$short" >/dev/null
  local v=""; for _ in $(seq 1 20); do v=$(curl -s http://127.0.0.1:8098/version.txt || true); [ "$v" = "$short" ] && break; sleep 2; done
  [ "$v" = "$short" ] || die "l'image candidate ne répond pas correctement."
  for u in / /acceuil/ /services/ /contact-us/; do [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8098$u")" = 200 ] || die "candidate : $u ne renvoie pas 200."; done
  docker rm -f tfn-cand >/dev/null

  # Image actuellement servie conservée pour retour arrière immédiat.
  local cur; cur=$(docker inspect "tfn-$name-web" --format '{{.Image}}' 2>/dev/null || true)
  [ -n "$cur" ] && docker tag "$cur" "tfn-site:$p-rollback"
  # shellcheck disable=SC2046
  GIT_COMMIT=$short docker compose $(env_args "$env") up -d --no-build
  wait_healthy "tfn-$name-web"
  check_public_version "$env" "$short"
  log "DEPLOYE $env $short"
}

case ${1:-} in
  preprod|production) [ $# -ge 2 ] || die "commit manquant."; cmd_deploy "$@" ;;
  rollback) [ $# -eq 3 ] || die "usage : tfn-deploy rollback preprod|production <commit>"; cmd_rollback "$2" "$3" ;;
  status) cmd_status ;;
  *) sed -n '2,20p' "$0"; exit 1 ;;
esac
