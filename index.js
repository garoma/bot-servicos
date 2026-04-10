const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const handleMessage = require("./messageHandler");

const client = new Client({
  authStrategy: new LocalAuth(), // 👈 ISSO AQUI É O SEGREDO
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("🤖 Bot pronto!");
});

client.on("message", async (message) => {
  console.log(`📩 Mensagem recebida de ${message.from}: ${message.body}`);
  await handleMessage(client, message);
});

client.initialize(); 0