/**
 * Contract for interactive messages carried in `content_attributes.interactive`.
 *
 * The platform maps this contract to the motor's REST endpoints:
 *   buttons   -> POST /messages/buttons  (reply/CTA: url, copy, call)
 *   list      -> POST /messages/list
 *   poll      -> POST /messages/poll
 *   carousel  -> POST /messages/carousel
 *   image     -> POST /messages/image     (viewOnce)
 *   video     -> POST /messages/video     (viewOnce, gifPlayback)
 *   audio     -> POST /messages/audio     (ptt, viewOnce)
 *   document  -> POST /messages/document
 *   sticker   -> POST /messages/sticker
 *   location  -> POST /messages/location
 *   contact   -> POST /messages/contact
 *   reaction  -> POST /messages/reaction
 * and back (replies: button_reply / list_reply from the motor upserts).
 *
 * Received (customer tapped an option):
 *   { type: 'button_reply', title, id?, description? }
 *   { type: 'list_reply', title, id?, description? }
 *
 * Sent (agent composer or platform):
 *   { type: 'buttons', body?, footer?, buttons: [{ type: 'reply'|'url'|'copy'|'call',
 *       id?, title?, url?, copyText?, phoneNumber? }] }            (nativo: até 3; nativeFlow aceita mais)
 *   { type: 'list', body?, footer?, button, sections: [{ title, rows: [{ id, title, description? }] }] }
 *   { type: 'poll', name, options: [string | { name }], selectableCount?: 1 }
 *   { type: 'carousel', body?, footer?, cards: [{ mediaUrl?, title?, body?, footer?, buttons: [...] }] }
 *   { type: 'image', url, caption?, viewOnce? }
 *   { type: 'video', url, caption?, viewOnce?, gifPlayback?, mimeType? }
 *   { type: 'audio', url, ptt?, viewOnce?, mimeType? }
 *   { type: 'document', url, fileName?, mimeType?, caption? }
 *   { type: 'sticker', url }
 *   { type: 'location', latitude, longitude, name?, address? }
 *   { type: 'contact', displayName, vcard }
 *   { type: 'reaction', reaction, messageId? }
 */

export const INTERACTIVE_TYPES = {
  BUTTONS: 'buttons',
  LIST: 'list',
  CAROUSEL: 'carousel',
  POLL: 'poll',
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  STICKER: 'sticker',
  LOCATION: 'location',
  CONTACT: 'contact',
  REACTION: 'reaction',
};

const REPLY_TYPES = [
  INTERACTIVE_TYPES.BUTTON_REPLY,
  INTERACTIVE_TYPES.LIST_REPLY,
];

const MEDIA_TYPES = [
  INTERACTIVE_TYPES.IMAGE,
  INTERACTIVE_TYPES.VIDEO,
  INTERACTIVE_TYPES.AUDIO,
  INTERACTIVE_TYPES.DOCUMENT,
  INTERACTIVE_TYPES.STICKER,
];

const KNOWN_TYPES = [
  ...REPLY_TYPES,
  INTERACTIVE_TYPES.BUTTONS,
  INTERACTIVE_TYPES.LIST,
  INTERACTIVE_TYPES.CAROUSEL,
  INTERACTIVE_TYPES.POLL,
  ...MEDIA_TYPES,
  INTERACTIVE_TYPES.LOCATION,
  INTERACTIVE_TYPES.CONTACT,
  INTERACTIVE_TYPES.REACTION,
];

export const MAX_BUTTONS = 3;
export const MAX_LIST_SECTIONS = 10;
export const MAX_LIST_ROWS = 10;
export const MAX_CARDS = 10;
export const MAX_QUICK_REPLIES = 16;
export const MAX_POLL_OPTIONS = 12;

const BUTTON_TYPES = ['reply', 'url', 'copy', 'call'];

function normalizeButton(button, index) {
  if (!button) return null;
  const title = button.title || button.text || '';
  if (!title) return null;
  return {
    type: BUTTON_TYPES.includes(button.type) ? button.type : 'reply',
    id: button.id || `btn_${index + 1}`,
    title,
    url: button.url || '',
    copyText: button.copyText || '',
    phoneNumber: button.phoneNumber || '',
  };
}

export function getInteractive(contentAttributes) {
  const payload = contentAttributes?.interactive;
  if (!payload || typeof payload !== 'object') return null;
  const { type } = payload;
  if (!KNOWN_TYPES.includes(type)) return null;

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
    header: payload.header || payload.title || '',
    body: payload.body || payload.text || payload.caption || '',
    footer: payload.footer || '',
    button: payload.button || payload.buttonText || '',
    name: payload.name || payload.displayName || '',
    options: Array.isArray(payload.options) ? payload.options : [],
    selectableCount: payload.selectableCount || 1,
    votes:
      payload.votes && typeof payload.votes === 'object' ? payload.votes : null,
    buttons: Array.isArray(payload.buttons)
      ? payload.buttons.map(normalizeButton).filter(Boolean)
      : [],
    sections: Array.isArray(payload.sections)
      ? payload.sections
          .filter(section => section && typeof section === 'object')
          .map(section => ({
            title: section.title || '',
            rows: Array.isArray(section.rows)
              ? section.rows
                  .filter(row => row && typeof row === 'object')
                  .map(row => ({
                    id: row.id || '',
                    title: row.title || row.text || '',
                    description: row.description || '',
                  }))
              : [],
          }))
      : [],
    cards: Array.isArray(payload.cards)
      ? payload.cards
          .filter(card => card && typeof card === 'object')
          .map(card => ({
            ...card,
            buttons: Array.isArray(card?.buttons)
              ? card.buttons.map(normalizeButton).filter(Boolean)
              : [],
          }))
      : [],
    url: payload.url || '',
    fileName: payload.fileName || '',
    mimeType: payload.mimeType || '',
    viewOnce: !!payload.viewOnce,
    gifPlayback: !!payload.gifPlayback,
    ptt: !!payload.ptt,
    latitude: payload.latitude,
    longitude: payload.longitude,
    address: payload.address || '',
    vcard: payload.vcard || '',
    reaction: payload.reaction || '',
    messageId: payload.messageId || '',
  };
}

export function isInteractiveReply(interactive) {
  return !!interactive && REPLY_TYPES.includes(interactive.type);
}

export function isInteractiveMedia(interactive) {
  return !!interactive && MEDIA_TYPES.includes(interactive.type);
}

export function pollOptions(interactive) {
  if (!interactive || interactive.type !== INTERACTIVE_TYPES.POLL) return [];
  return interactive.options
    .map(option => (typeof option === 'string' ? { name: option } : option))
    .filter(option => option?.name);
}
