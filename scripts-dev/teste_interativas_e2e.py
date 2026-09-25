#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Teste e2e: mensagens interativas (botões/lista/carrossel) no Chatwoot do laboratório."""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("CW_BASE", "http://localhost:3100/api/v1/accounts/1")
TOKEN = os.environ["CW_TOKEN"]


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
        return {"__status": e.code, "__body": e.read().decode()[:300]}


CONV = sys.argv[1] if len(sys.argv) > 1 else "3"
G1 = "120363012345678999@g.us"

messages = [
    # cliente tocou um botão (resposta interativa)
    {
        "message_type": "incoming",
        "content": "Sim, quero receber",
        "content_attributes": {
            "interactive": {"type": "button_reply", "title": "Sim, quero receber", "id": "btn_1"},
            "sender_name": "Renato", "senderJid": "5511991112222@lid", "chatJid": G1, "isGroup": True,
        },
    },
    # agente enviou botões
    {
        "message_type": "outgoing",
        "content": "Escolha uma opção de atendimento:",
        "content_attributes": {
            "interactive": {
                "type": "buttons",
                "body": "Escolha uma opção de atendimento:",
                "footer": "Atendimento Infinite",
                "buttons": [
                    {"id": "btn_1", "title": "Falar com vendedor"},
                    {"id": "btn_2", "title": "Segunda via de boleto"},
                    {"id": "btn_3", "title": "Encerrar atendimento"},
                ],
            }
        },
    },
    # agente enviou lista
    {
        "message_type": "outgoing",
        "content": "Nossos planos disponíveis:",
        "content_attributes": {
            "interactive": {
                "type": "list",
                "body": "Nossos planos disponíveis:",
                "button": "Ver planos",
                "sections": [
                    {
                        "title": "Planos de internet",
                        "rows": [
                            {"id": "p1", "title": "Plano Básico", "description": "300 Mega"},
                            {"id": "p2", "title": "Plano Pro", "description": "700 Mega + Wi-Fi 6"},
                            {"id": "p3", "title": "Plano Turbo", "description": "1 Giga dedicado"},
                        ],
                    }
                ],
            }
        },
    },
    # agente enviou carrossel
    {
        "message_type": "outgoing",
        "content": "Confira nossas ofertas:",
        "content_attributes": {
            "interactive": {
                "type": "carousel",
                "body": "Confira nossas ofertas:",
                "cards": [
                    {
                        "mediaUrl": "https://picsum.photos/seed/fibra/400/300",
                        "body": "Fibra 700 Mega — R$ 89,90/mês",
                        "buttons": [{"id": "c1", "title": "Contratar agora"}],
                    },
                    {
                        "mediaUrl": "https://picsum.photos/seed/wifi/400/300",
                        "body": "Wi-Fi 6 Mesh — R$ 29,90/mês",
                        "buttons": [{"id": "c2", "title": "Quero esse"}],
                    },
                ],
            }
        },
    },
]

ok = True
for m in messages:
    res = api("POST", f"/conversations/{CONV}/messages", m)
    label = res.get("content_attributes", {}).get("interactive", {}).get("type", "?")
    status = "OK" if res.get("id") else f"FALHOU {res}"
    if not res.get("id"):
        ok = False
    print(f"  {status}: {label}")

print("E2E_INTERATIVAS:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
