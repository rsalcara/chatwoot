# Mensagens interativas (botões/lista/carrossel) — contrato platform ↔ Chatwoot ↔ motor

> **Escopo:** o fork do Chatwoot (`rsalcara/chatwoot`) agora **renderiza** mensagens
> interativas (entrada e saída) e tem **composer no reply box** para o atendente enviar.
> A plataforma liga os lados: recebe do motor, publica no Chatwoot; lê o webhook do
> Chatwoot e envia pelo motor. **Nenhuma mudança no motor** — ele já suporta
> `interactiveMessage`/`nativeFlowMessage`/`carouselMessage`
> (`messages-send.ts:1301-1340`) e `messageId` pré-gerável (`Types/Message.ts:1165`).

---

## 1. Contrato único: `content_attributes.interactive`

**Recebida** (cliente tocou uma opção — o `content` é o texto/título tocado):

```json
{ "interactive": { "type": "button_reply", "title": "Sim, quero receber", "id": "btn_1" } }
{ "interactive": { "type": "list_reply", "title": "Plano Pro", "id": "row_2", "description": "700 Mega" } }
```

**Enviada** (atendente pelo composer, ou platform via API):

```json
{ "interactive": { "type": "buttons", "header": "", "body": "Escolha:", "footer": "Atendimento",
    "buttons": [ { "id": "btn_1", "title": "Falar com vendedor" }, ... ] } }

{ "interactive": { "type": "list", "body": "Nossos planos:", "footer": "", "button": "Ver planos",
    "sections": [ { "title": "Planos", "rows": [ { "id": "p1", "title": "Pro", "description": "700 Mega" } ] } ] } }

{ "interactive": { "type": "carousel", "body": "Confira:", "footer": "",
    "cards": [ { "mediaUrl": "https://...", "body": "Oferta", "buttons": [ { "id": "c1", "title": "Contratar" } ] } ] } }
```

Limites do WhatsApp: 3 botões rápidos, 10 linhas de lista, 10 cards de carrossel
(validados no helper `interactive.js` do fork).

## 2. Fluxo de RECEBIMENTO (motor → platform → Chatwoot)

1. Motor emite `messages.upsert`; a resposta do cliente vem em
   `message.interactiveResponseMessage.nativeFlowResponseMessage`
   (`name` = tipo do flow, `paramsJson` = JSON string com `{ id, display_text }` ou
   `{ selected_row_id, selected_display_text }`).
2. **Platform** publica `message.received` com:
   - `content` = `display_text`/`selected_display_text` (texto tocado);
   - `content_attributes.interactive` = `{ type: 'button_reply'|'list_reply', title, id }`.
3. Chatwoot renderiza: badge com ícone + título tocado + texto (validado no lab).

## 3. Fluxo de ENVIO (Chatwoot → platform → motor)

1. Atendente envia pelo composer (⚡ Interactive) ou a platform posta via API:
   `POST /conversations/{id}/messages` com `message_type: 'outgoing'`,
   `content` = corpo, `content_attributes.interactive` = payload acima.
   - O composer do fork manda exatamente esse shape; o webhook `message_created`
     entrega `content_attributes` integral à platform.
   - Correlação de eco `fromMe`: usar `source_id`/`messageId` pré-gerado
     (mesma regra do doc de grupos, §6.5).
2. **Platform → motor** (mapeamento para o Baileys `sendMessage`):

| `interactive.type` | Payload do motor |
|---|---|
| `buttons` | `interactiveMessage: { body: { text }, footer: { text }, nativeFlowMessage: { buttons: [ { name: 'quick_reply', buttonParamsJson: '{"id":"btn_1","display_text":"..."}' } ] } }` |
| `list` | `interactiveMessage: { body: { text }, footer: { text }, nativeFlowMessage: { buttons: [ { name: 'single_select', buttonParamsJson: JSON.stringify({ id, display_text: button, sections }) } ] } }` |
| `carousel` | `interactiveMessage: { carouselMessage: { cards: [ { header: { title, <imagem> }, body: { text }, footer: { text }, nativeFlowMessage: { buttons: [ { name: 'quick_reply', buttonParamsJson } ] } } ] } }` — o motor detecta carrossel por cards com `nativeFlowMessage.buttons` (`messages-send.ts:1326-1337`) |

3. Imagens de card: `header` do card aceita imagem (photo/imageMessage) — a platform baixa
   a `mediaUrl` do card e anexa no header do proto.

## 4. O que já está pronto no fork (esta PR)

- **Renderização** entrada/saída: `bubbles/Interactive.vue` (chips, seções de lista,
  carrossel com imagens) — visual fiel ao WhatsApp, ambos os lados.
- **Composer** no reply box (⚡ Interactive) para botões/lista/carrossel, com limites
  nativos e validação — `components-next/Conversation/InteractiveComposer.vue`.
- **Helper + spec**: `helpers/interactive.js` (normalização e limites) — 16 testes ok.
- Roteamento em `Message.vue` e envio pelo store (`onSendInteractive` no ReplyBox).
- Script de lab: `scripts-dev/teste_interativas_e2e.py` (4 tipos + resposta).

## 5. Checklist validado no laboratório

1. Resposta do cliente (button_reply) → badge + texto. ✔
2. Botões enviados via API → chips + rodapé. ✔
3. Lista enviada via API → seções + opções + chip do menu. ✔
4. Carrossel via API → cards com imagem e botões. ✔
5. Envio pelo composer na UI → mensagem `outgoing` com `content_attributes.interactive`
   gravada e renderizada (id 22, status sent). ✔


## 6. Matriz completa de tipos (motor REST ↔ contrato)

O motor já expõe REST para todos os tipos (`/messages/*`); a platform mapeia o
`content_attributes` para o endpoint correspondente. Mídia (imagem, vídeo, GIF, áudio,
documento, figurinha, localização, contato) já é nativa no Chatwoot nos dois sentidos
(attachments); os casos especiais seguem via atributos:

| Tipo (motor) | Chatwoot: render | Chatwoot: composer | Mapeamento platform → motor |
|---|---|---|---|
| Respostas rápidas (`/messages/buttons`, type reply) | ✅ chips | ✅ (até 16 via nativeFlow) | `interactive.type=buttons` |
| Botões CTA (url/copy/call) | ✅ chips com ícone/ação | ✅ (seletor por botão) | `buttons[].{type,url,copyText,phoneNumber}` |
| Lista interativa (`/messages/list`) | ✅ seções + menu | ✅ | `interactive.type=list` |
| Enquete (`/messages/poll`) | ✅ opções + seleção | ✅ (única/múltipla) | `interactive.type=poll` |
| Carrossel (`/messages/carousel`) | ✅ cards + botões | ✅ | `interactive.type=carousel` |
| Imagem/Vídeo/GIF/Áudio/Documento (`/messages/image|video|audio|document`) | ✅ nativo | ✅ | attachments nativos |
| Visualização única (`viewOnce`) | ⚠️ badge (futuro) | ❌ | attr `media_flags` → payload do motor |
| Figurinha (`/messages/sticker`) | ✅ nativo (webp) | ❌ | attr → endpoint |
| Localização (`/messages/location`) | ✅ nativo | ❌ | attr → endpoint |
| Contato (`/messages/contact`) | ✅ nativo (vCard) | ❌ | attr → endpoint |
| Reação (`/messages/reaction`) | ⚠️ texto com emoji (futuro: anotação) | ❌ | attr `reaction` → endpoint |

**Biblioteca de modelos:** o composer permite salvar quantos modelos o agente quiser
(por conta, no navegador) e reutilizá-los em qualquer canal/conversa/grupo com 1 clique.
Modelos compartilhados entre agentes (servidor) ficam como evolução futura — a platform
pode expor os próprios modelos via API sem mudar o fork.

## 7. Validação no laboratório (tipos adicionais)

1. Botões CTA (copiar/url/ligar) → chips com ícones corretos. ✔
2. Enquete (4 opções, seleção única) → renderização fiel + rodapé. ✔
3. Enquete enviada pelo composer via UI (id 25) + modelo "Enquete setor" salvo e
   recarregável. ✔
