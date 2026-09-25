#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Teste ponta a ponta: grupos do WhatsApp como conversas no Chatwoot (fork local).

Uso:
  bash -c 'export CW_TOKEN=$(docker compose exec -T rails bundle exec rails runner \
    "print User.find_by(email: \"john@acme.inc\").access_token.token" 2>/dev/null | tail -c 40); \
    python scripts-dev/teste_grupos_e2e.py'
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("CW_BASE", "http://localhost:3100/api/v1/accounts/1")
TOKEN = os.environ["CW_TOKEN"]
INBOX_NAME = "WhatsApp Grupos (teste)"


def api(method, path, body=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"api_access_token": TOKEN, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"__status": e.code, "__body": e.read().decode()[:400]}


def get_or_create_inbox():
    for inbox in api("GET", "/inboxes").get("payload", []):
        if inbox["name"] == INBOX_NAME:
            return inbox["id"]
    res = api("POST", "/inboxes", {
        "name": INBOX_NAME,
        "channel": {"type": "api", "webhook_url": "http://example.com/hook"},
    })
    return res["id"]


def get_or_create_contact(identifier, name):
    res = api("GET", f"/contacts/search?q={urllib.parse.quote(identifier)}")
    payload = res.get("payload", [])
    if isinstance(payload, dict):
        payload = payload.get("payload", payload.get("contacts", []))
    for c in payload:
        if isinstance(c, dict) and c.get("identifier") == identifier:
            return c["id"]
    res = api("POST", "/contacts", {
        "identifier": identifier, "name": name,
        "inbox_id": INBOX_ID, "source_id": identifier,
    })
    if "contact" not in res:
        print(f"FALHOU criar contato {identifier}: {str(res)[:300]}")
        sys.exit(1)
    return res["contact"]["id"]


def get_or_create_conversation(identifier, contact_id):
    res = api("POST", "/conversations", {
        "source_id": identifier, "inbox_id": INBOX_ID, "contact_id": contact_id,
    })
    # O serializer de create usa `id` como display_id
    conv_id = res.get("id", res.get("display_id"))
    if not conv_id:
        print(f"FALHOU criar conversa {identifier}: {str(res)[:300]}")
        sys.exit(1)
    return conv_id


def post_message(conversation_id, content, sender_name, sender_jid, chat_jid):
    return api("POST", f"/conversations/{conversation_id}/messages", {
        "message_type": "incoming",
        "content": content,
        "content_attributes": {
            "sender_name": sender_name, "senderJid": sender_jid,
            "chatJid": chat_jid, "isGroup": True,
        },
    })


ok = lambda label: print(f"  OK  {label}")
fail = lambda label: print(f"  FALHOU {label}")

print("== 1) inbox API ==")
INBOX_ID = get_or_create_inbox()
print(f"  inbox_id={INBOX_ID}")

print("== 2) lock_to_single_conversation ==")
res = api("PATCH", f"/inboxes/{INBOX_ID}", {"lock_to_single_conversation": True})
locked = res.get("lock_to_single_conversation")
(ok if locked else fail)(f"lock={locked}")

print("== 3) grupo 1: contato pelo JID ==")
G1 = "120363012345678999@g.us"
C1 = get_or_create_contact(G1, "Grupo Família (teste)")
(ok if C1 else fail)(f"contact_id={C1}")

print("== 4) grupo 1: conversa ==")
CONV1 = get_or_create_conversation(G1, C1)
(ok if CONV1 else fail)(f"display_id={CONV1}")

print("== 5) mensagens de 3 participantes ==")
for content, name, jid in [
    ("Bom dia gente!", "Renato", "5511991112222@lid"),
    ("Bom dia! Alguém viu o boleto?", "Maria", "5511982223333@s.whatsapp.net"),
    ("Já enviei por e-mail", "João", "5511973334444@s.whatsapp.net"),
]:
    m = post_message(CONV1, content, name, jid, G1)
    (ok if m.get("id") else fail)(f"{name}: {content} (msg id={m.get('id')})")

print("== 6) reuso da conversa do grupo 1 ==")
CONV1B = get_or_create_conversation(G1, C1)
(ok if CONV1B == CONV1 else fail)(f"mesma conversa reutilizada ({CONV1B} vs {CONV1})")

print("== 7) grupo 2 tem conversa própria ==")
G2 = "120363098765432111@g.us"
C2 = get_or_create_contact(G2, "Grupo Trabalho (teste)")
CONV2 = get_or_create_conversation(G2, C2)
(ok if CONV2 != CONV1 else fail)(f"grupo 2 -> conversa {CONV2}")

print("== 8) resumo ==")
convs = api("GET", f"/conversations?inbox_id={INBOX_ID}").get("data", {}).get("payload", [])
print(f"  conversas no inbox de grupos: {len(convs)}")
for c in convs:
    meta = c.get("meta", {}).get("sender", {})
    print(f"    #{c.get('display_id', c.get('id'))} contato={meta.get('name')} identifier={meta.get('identifier')} msgs={len(c.get('messages', []))}")

print()
print(f"Abra http://localhost:3100/app/accounts/1/conversations/{CONV1} (john@acme.inc / Password1!)")
