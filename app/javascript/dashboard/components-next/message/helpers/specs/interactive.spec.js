import { getInteractive, isInteractiveReply } from '../interactive';

describe('#getInteractive', () => {
  it('returns null without content attributes', () => {
    expect(getInteractive({})).toBeNull();
    expect(getInteractive(null)).toBeNull();
  });

  it('returns null for unknown types', () => {
    expect(getInteractive({ interactive: { type: 'whatever' } })).toBeNull();
  });

  it('normalizes a buttons payload', () => {
    const result = getInteractive({
      interactive: {
        type: 'buttons',
        body: 'Escolhe',
        buttons: [
          { id: '1', title: 'Sim' },
          { title: 'Sem id' },
          { title: '' },
          { id: '4', title: 'Extra' },
        ],
      },
    });
    expect(result.type).toBe('buttons');
    expect(result.body).toBe('Escolhe');
    expect(result.buttons).toHaveLength(3); // max 3, empty title filtered
    expect(result.buttons[0]).toEqual({ id: '1', title: 'Sim' });
  });

  it('normalizes a list payload', () => {
    const result = getInteractive({
      interactive: {
        type: 'list',
        button: 'Ver opções',
        sections: [{ title: 'Planos', rows: [{ id: 'p1', title: 'Pro' }] }],
      },
    });
    expect(result.type).toBe('list');
    expect(result.button).toBe('Ver opções');
    expect(result.sections[0].rows[0].title).toBe('Pro');
  });

  it('normalizes a carousel payload', () => {
    const result = getInteractive({
      interactive: {
        type: 'carousel',
        cards: [
          {
            mediaUrl: 'https://x/y.png',
            body: 'Card',
            buttons: [{ id: 'c1', title: 'Comprar' }],
          },
        ],
      },
    });
    expect(result.type).toBe('carousel');
    expect(result.cards[0].mediaUrl).toBe('https://x/y.png');
    expect(result.cards[0].buttons[0].title).toBe('Comprar');
  });

  it('normalizes received replies', () => {
    const reply = getInteractive({
      interactive: { type: 'button_reply', title: 'Sim', id: '1' },
    });
    expect(reply.type).toBe('button_reply');
    expect(reply.title).toBe('Sim');
    expect(isInteractiveReply(reply)).toBe(true);
    expect(
      isInteractiveReply(
        getInteractive({ interactive: { type: 'buttons', buttons: [] } })
      )
    ).toBe(false);
  });
});
