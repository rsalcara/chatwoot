#!/bin/bash
# Diagnóstico: reproduz o payload exato do composer de carrossel via API.
set -uo pipefail

TOKEN=$(docker exec chatwoot-app bundle exec rails runner "print User.find_by(email: 'comercial@infinitezap.com.br').access_token.token" 2>/dev/null | tail -1)
echo "token: ${TOKEN:0:8}..."

CONV=$(docker exec chatwoot-app bundle exec rails runner 'a = Account.first; c = a.contacts.find_or_create_by!(identifier: "teste-carousel-999@lab.invalid") { |x| x.name = "TESTE carousel" }; ci = c.contact_inboxes.find_or_create_by!(inbox: Inbox.find(3)) { |x| x.source_id = "teste-carousel-999@lab.invalid" }; conv = a.conversations.create!(account: a, inbox_id: 3, contact_id: c.id, contact_inbox_id: ci.id); print conv.display_id' 2>/dev/null | tail -1)
echo "conversa teste: $CONV"

CIP=$(docker inspect -f '{{(index .NetworkSettings.Networks "chatwoot-internal").IPAddress}}' chatwoot-app)
echo "ip do container: $CIP"

curl -s -o /tmp/resp.json -w "HTTP %{http_code}\n" -X POST \
  "http://$CIP:3000/api/v1/accounts/1/conversations/$CONV/messages" \
  -H "api_access_token: $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-Proto: https" \
  --data @/root/payload_carrossel.json

head -c 400 /tmp/resp.json 2>/dev/null
echo
echo "=== ultimas linhas de erro do app:"
docker logs chatwoot-app --since 1m 2>&1 | grep -iE "error|fatal|Completed 500" | tail -6
