# rubocop:disable Rails/Output
# Diagnóstico executado via `rails runner` no servidor; saída em stdout.
puts "contatos com avatar: #{Contact.joins(:avatar_attachment).count}/#{Contact.count}"
Contact.order(:id).last(10).each do |c|
  ident = c.identifier.to_s[0, 30]
  nome = c.name.to_s[0, 26]
  puts "C=#{c.id} avatar=#{c.avatar.attached?} nome=#{nome} ident=#{ident}"
end
puts '--- mensagens de grupo (60min):'
Message.where('created_at > ?', 60.minutes.ago).order(:id).last(30).each do |m|
  ca = m.content_attributes
  next if ca['sender_name'].blank? && ca['chatAvatarUrl'].blank? && ca['senderAvatarUrl'].blank?

  sender = ca['sender_name'].to_s[0, 18]
  jid = ca['senderJid'].to_s[0, 24]
  flags = "chatAvatar=#{ca['chatAvatarUrl'].present?} senderAvatar=#{ca['senderAvatarUrl'].present?}"
  puts "M=#{m.id} C=#{m.conversation_id} sender=#{sender} senderJid=#{jid} #{flags}"
end
# rubocop:enable Rails/Output
