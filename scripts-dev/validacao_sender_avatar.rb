# rubocop:disable Rails/Output
puts '=== mensagens de grupo (90min) - senderAvatarUrl:'
vistos = 0
Message.where('created_at > ?', 90.minutes.ago).order(:id).last(40).each do |m|
  ca = m.content_attributes
  next if ca['sender_name'].blank?

  vistos += 1
  url = (ca['senderAvatarUrl'] || ca['sender_avatar_url']).to_s
  host = if url.present?
           begin
             URI.parse(url).host
           rescue StandardError
             'URL-INVALIDA'
           end
         else
           '-'
         end
  sender = ca['sender_name'].to_s[0, 16]
  puts "M=#{m.id} C=#{m.conversation_id} sender=#{sender} senderAvatar=#{url.present?} host=#{host[0, 26]}"
  puts "   chatAvatar=#{ca['chatAvatarUrl'].present?}"
end
puts "total com sender_name: #{vistos}"
puts '=== contatos com avatar (multipart):'
puts "com avatar: #{Contact.joins(:avatar_attachment).count}/#{Contact.count}"
Contact.joins(:avatar_attachment).order(:id).last(6).each do |c|
  grupo = c.identifier.to_s.include?('@g.us')
  puts "C=#{c.id} #{c.name.to_s[0, 24]} grupo=#{grupo}"
end
# rubocop:enable Rails/Output
