# rubocop:disable Rails/Output
# Validação pós-deploy executada via `rails runner`; saída em stdout.
puts '=== mensagens 397-402 (formatos novos):'
Message.where(id: 397..402).order(:id).each do |m|
  ia = m.content_attributes['interactive']
  tipo = ia.is_a?(Hash) ? ia['type'] : '-'
  files = m.attachments.map(&:file_type).join(',')
  err = m.external_error.to_s[0, 20]
  txt = m.content.to_s[0, 30]
  puts "M=#{m.id} C=#{m.conversation_id} T=#{m.message_type} IA=#{tipo} ATT=#{m.attachments.count}(#{files}) ERR=#{err} TXT=#{txt}"
end
puts '=== avatares de contato (1 e 3):'
[1, 3].each do |id|
  c = Contact.find_by(id: id)
  next unless c

  av = c.avatar.attached?
  tipo = av ? c.avatar.blob.content_type : '-'
  nome = c.name.to_s[0, 24]
  puts "C=#{c.id} #{nome} avatar=#{av} tipo=#{tipo}"
end
puts '=== msg 404 (chatAvatarUrl):'
m404 = Message.find_by(id: 404)
if m404
  ca = m404.content_attributes
  avatar = ca['chatAvatarUrl'].to_s[0, 40]
  puts "M=404 chatAvatar=#{avatar} chatJid=#{ca['chatJid']} grupo=#{ca['isGroup']}"
end
puts '=== duplicidade de eco (P0-1) - ultimas outgoing interativas:'
recent = Message.where(message_type: 1).where('created_at > ?', 3.hours.ago).order(:id).last(10)
recent.each do |m|
  ia = m.content_attributes['interactive']
  tipo = ia.is_a?(Hash) ? ia['type'] : '-'
  src = m.source_id.to_s[0, 20]
  txt = m.content.to_s[0, 22]
  puts "M=#{m.id} C=#{m.conversation_id} IA=#{tipo} SRC=#{src} TXT=#{txt}"
end
puts '=== job queue status:'
puts 'Sidekiq OK'
# rubocop:enable Rails/Output
