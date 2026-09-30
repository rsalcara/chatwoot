import { MESSAGE_TYPES } from '../constants';

/**
 * Returns the display name of the individual participant who sent this
 * message inside a group conversation (e.g. a WhatsApp group mapped to an
 * API channel inbox).
 *
 * Bridges publish the participant name through `content_attributes.sender_name`
 * (with `additional_attributes.senderName` kept as a fallback for
 * Slack-style integrations). Only incoming, non-private messages carry it.
 */
export function getGroupSenderName(message) {
  if (!message) return '';
  if (message.messageType !== MESSAGE_TYPES.INCOMING) return '';
  if (message.private) return '';

  const contentAttributes = message.contentAttributes || {};
  const additionalAttributes = message.additionalAttributes || {};

  return (
    contentAttributes.sender_name ||
    contentAttributes.senderName ||
    additionalAttributes.senderName ||
    ''
  );
}

export function getGroupSenderAvatarUrl(message) {
  if (!message) return '';
  const contentAttributes = message.contentAttributes || {};
  return (
    contentAttributes.senderAvatarUrl ||
    contentAttributes.sender_avatar_url ||
    ''
  );
}

/**
 * Group conversation photo (published by bridges through
 * `content_attributes.chatAvatarUrl`), used as the avatar fallback when the
 * participant has no picture.
 */
export function getGroupChatAvatarUrl(message) {
  if (!message) return '';
  const contentAttributes = message.contentAttributes || {};
  return (
    contentAttributes.chatAvatarUrl || contentAttributes.chat_avatar_url || ''
  );
}
