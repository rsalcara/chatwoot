# Maps the content_attributes.interactive contract to the WhatsApp Cloud API
# interactive payload. Only 'buttons' (reply kind) and 'list' have a native
# equivalent; button_reply/list_reply are inbound-only and poll/carousel have
# no native counterpart, so those return nil and the message falls back to
# plain text.
class Whatsapp::Providers::InteractivePayloadBuilder
  LIMIT_BUTTONS = 3
  LIMIT_SECTIONS = 10
  LIMIT_ROWS = 10

  def self.build(message)
    payload = message.content_attributes['interactive']
    return if payload.blank?

    case payload['type']
    when 'buttons' then build_buttons(message, payload)
    when 'list' then build_list(message, payload)
    end
  end

  def self.build_buttons(message, payload)
    buttons = Array(payload['buttons']).filter_map { |button| reply_button(button) }.first(LIMIT_BUTTONS)
    return if buttons.empty?

    { type: 'button', **content(message, payload), action: { buttons: buttons } }.compact
  end

  def self.reply_button(button)
    return if button['kind'].present? && button['kind'] != 'reply'

    { type: 'reply', reply: { id: (button['id'] || button['title']).to_s, title: button['title'].to_s } }
  end

  def self.build_list(message, payload)
    raw_sections = Array(payload['sections']).first(LIMIT_SECTIONS)
    sections = raw_sections.filter_map { |section| list_section(section, raw_sections.many?) }
    return if sections.empty?

    action = { button: payload['button'].presence || I18n.t('conversations.messages.whatsapp.list_button_label'), sections: sections }
    { type: 'list', **content(message, payload), action: action }.compact
  end

  def self.list_section(section, many_sections)
    rows = Array(section['rows']).first(LIMIT_ROWS).map { |row_data| list_row(row_data) }
    return if rows.empty?

    section_payload = { rows: rows }
    section_payload[:title] = section['title'].to_s if many_sections || section['title'].present?
    section_payload
  end

  def self.list_row(row_data)
    row = { id: (row_data['id'] || row_data['title']).to_s, title: row_data['title'].to_s }
    row[:description] = row_data['description'].to_s if row_data['description'].present?
    row
  end

  def self.content(message, payload)
    {
      header: payload['header'].present? ? { type: 'text', text: payload['header'] } : nil,
      body: { text: message.outgoing_content },
      footer: payload['footer'].present? ? { text: payload['footer'] } : nil
    }.compact
  end
end
