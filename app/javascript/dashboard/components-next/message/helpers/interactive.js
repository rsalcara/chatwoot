/**
 * Contract for interactive messages (WhatsApp buttons / list / carousel)
 * carried in `content_attributes.interactive`.
 *
 * Received (customer tapped an option — bridge fills title):
 *   { type: 'button_reply', title, id?, description? }
 *   { type: 'list_reply', title, id?, description? }
 *
 * Sent (agent or platform; platform maps this to the motor's
 * interactiveMessage/nativeFlowMessage/carouselMessage):
 *   { type: 'buttons', header?, body?, footer?, buttons: [{ id, title }] }        (1..3)
 *   { type: 'list', body?, footer?, button, sections: [{ title, rows: [{ id, title, description? }] }] }
 *   { type: 'carousel', body?, footer?, cards: [{ mediaUrl?, body?, buttons: [{ id, title }] }] }
 */

export const INTERACTIVE_TYPES = {
  BUTTONS: 'buttons',
  LIST: 'list',
  CAROUSEL: 'carousel',
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
};

const COMPOSABLE_TYPES = [
  INTERACTIVE_TYPES.BUTTONS,
  INTERACTIVE_TYPES.LIST,
  INTERACTIVE_TYPES.CAROUSEL,
];

const REPLY_TYPES = [
  INTERACTIVE_TYPES.BUTTON_REPLY,
  INTERACTIVE_TYPES.LIST_REPLY,
];

export const MAX_BUTTONS = 3;
export const MAX_LIST_ROWS = 10;
export const MAX_CARDS = 10;

export function getInteractive(contentAttributes) {
  const payload = contentAttributes?.interactive;
  if (!payload || typeof payload !== 'object') return null;
  const { type } = payload;
  if (![...COMPOSABLE_TYPES, ...REPLY_TYPES].includes(type)) return null;

  if (REPLY_TYPES.includes(type)) {
    return {
      type,
      title: payload.title || '',
      id: payload.id || '',
      description: payload.description || '',
    };
  }

  return {
    type,
    header: payload.header || '',
    body: payload.body || '',
    footer: payload.footer || '',
    button: payload.button || '',
    buttons: Array.isArray(payload.buttons)
      ? payload.buttons.filter(button => button?.title).slice(0, MAX_BUTTONS)
      : [],
    sections: Array.isArray(payload.sections) ? payload.sections : [],
    cards: Array.isArray(payload.cards)
      ? payload.cards.slice(0, MAX_CARDS)
      : [],
  };
}

export function isInteractiveReply(interactive) {
  return !!interactive && REPLY_TYPES.includes(interactive.type);
}
