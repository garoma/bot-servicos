const BOT_MARK = '\u200B\u200C';

function isGroupMessage(message) {
  return (
    message?.from?.endsWith('@g.us') ||
    message?.isGroup === true
  );
}

function isBotMessage(message) {
  return message?.body?.includes(BOT_MARK);
}

function isPrivateChatId(id) {
  return typeof id === 'string' && (id.endsWith('@c.us') || id.endsWith('@lid'));
}

async function isGroupChat(message) {
  try {
    const chat = await message.getChat();
    return chat.isGroup;
  } catch (e) {
    console.log("⚠️ Erro ao identificar chat:", message.from);
    return false;
  }
}

module.exports = {
  BOT_MARK,
  isGroupMessage,
  isBotMessage,
  isPrivateChatId,
  isGroupChat
};
