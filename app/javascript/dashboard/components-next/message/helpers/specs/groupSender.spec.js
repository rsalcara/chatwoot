import { getGroupSenderName, getGroupSenderAvatarUrl } from '../groupSender';
import { MESSAGE_TYPES } from '../../constants';

const incomingMessage = ({
  contentAttributes = {},
  additionalAttributes = {},
} = {}) => ({
  messageType: MESSAGE_TYPES.INCOMING,
  private: false,
  contentAttributes,
  additionalAttributes,
});

describe('#getGroupSenderName', () => {
  it('returns empty for falsy messages', () => {
    expect(getGroupSenderName(null)).toBe('');
    expect(getGroupSenderName(undefined)).toBe('');
  });

  it('returns empty for non-incoming messages', () => {
    const message = {
      messageType: MESSAGE_TYPES.OUTGOING,
      private: false,
      contentAttributes: { sender_name: 'Renato' },
    };
    expect(getGroupSenderName(message)).toBe('');
  });

  it('returns empty for private notes', () => {
    const message = incomingMessage({
      contentAttributes: { sender_name: 'Renato' },
    });
    message.private = true;
    expect(getGroupSenderName(message)).toBe('');
  });

  it('returns sender_name from content attributes', () => {
    const message = incomingMessage({
      contentAttributes: { sender_name: 'Renato' },
    });
    expect(getGroupSenderName(message)).toBe('Renato');
  });

  it('falls back to camelCase senderName in content attributes', () => {
    const message = incomingMessage({
      contentAttributes: { senderName: 'Renato' },
    });
    expect(getGroupSenderName(message)).toBe('Renato');
  });

  it('falls back to additional attributes senderName', () => {
    const message = incomingMessage({
      additionalAttributes: { senderName: 'Renato' },
    });
    expect(getGroupSenderName(message)).toBe('Renato');
  });

  it('returns empty when no sender attribute is present', () => {
    expect(getGroupSenderName(incomingMessage())).toBe('');
  });
});

describe('#getGroupSenderAvatarUrl', () => {
  it('returns empty for falsy messages', () => {
    expect(getGroupSenderAvatarUrl(null)).toBe('');
  });

  it('returns sender_avatar_url when present', () => {
    const message = incomingMessage({
      contentAttributes: { sender_avatar_url: 'https://example.com/a.png' },
    });
    expect(getGroupSenderAvatarUrl(message)).toBe('https://example.com/a.png');
  });

  it('returns empty when absent', () => {
    expect(getGroupSenderAvatarUrl(incomingMessage())).toBe('');
  });
});
