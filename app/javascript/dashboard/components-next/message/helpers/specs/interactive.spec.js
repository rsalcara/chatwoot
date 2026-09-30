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
    expect(result.buttons).toHaveLength(3);
    expect(result.buttons[0].id).toBe('1');
    expect(result.buttons[0].title).toBe('Sim');
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

  it('normalizes a buttons payload without slicing', () => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({
      id: `b${i}`,
      text: `Opção ${i}`,
    }));
    const result = getInteractive({
      interactive: { type: 'buttons', buttons, body: 'Menu' },
    });
    expect(result.buttons).toHaveLength(16);
    expect(result.buttons[15].title).toBe('Opção 15');
  });

  it('normalizes CTA button fields', () => {
    const result = getInteractive({
      interactive: {
        type: 'buttons',
        body: 'PIX',
        buttons: [
          { type: 'url', text: 'Ver pedido', url: 'https://x.com' },
          { type: 'copy', text: 'Copiar PIX', copyText: '00020126' },
          { type: 'call', text: 'Ligar', phoneNumber: '+5511999999999' },
        ],
      },
    });
    expect(result.buttons[0].type).toBe('url');
    expect(result.buttons[0].url).toBe('https://x.com');
    expect(result.buttons[1].copyText).toBe('00020126');
    expect(result.buttons[2].phoneNumber).toBe('+5511999999999');
  });

  it('normalizes a poll payload', () => {
    const result = getInteractive({
      interactive: {
        type: 'poll',
        name: 'Qual tecnologia?',
        options: ['JS', 'Python', { name: 'Go' }],
        selectableCount: 1,
      },
    });
    expect(result.type).toBe('poll');
    expect(result.name).toBe('Qual tecnologia?');
    expect(result.options).toHaveLength(3);
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

  it('normalizes a list_reply with description', () => {
    const reply = getInteractive({
      interactive: {
        type: 'list_reply',
        title: 'Plano Pro',
        id: 'row_2',
        description: 'R$ 99/mês',
      },
    });
    expect(reply.type).toBe('list_reply');
    expect(reply.title).toBe('Plano Pro');
    expect(reply.id).toBe('row_2');
    expect(reply.description).toBe('R$ 99/mês');
    expect(isInteractiveReply(reply)).toBe(true);
  });

  it('normalizes malformed list sections and rows', () => {
    const result = getInteractive({
      interactive: {
        type: 'list',
        button: 'Menu',
        sections: [
          null,
          'nope',
          { title: 'Planos', rows: [{ id: 'p1', title: 'Pro' }, 42, null] },
          { rows: 'not-an-array' },
        ],
      },
    });
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].rows).toHaveLength(1);
    expect(result.sections[0].rows[0].title).toBe('Pro');
    expect(result.sections[1].rows).toEqual([]);
  });
});
