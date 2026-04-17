const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const messageHandler = require("./messageHandler");

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on("qr", qr => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("🤖 Bot pronto!");
});

client.on("message", async (message) => {
  try {
    const id = message.from || "";

    console.log("📩 Mensagem recebida de:", id);

    // ignorar sistema
    if (message.fromMe) return;
    if (id.includes("status@broadcast")) return;
    if (id.includes("@newsletter")) return;
    if (id.endsWith("@g.us")) return;
    //if (id.endsWith("@lid")) return; // opcional

    if (!message.body?.trim()) return;

    await messageHandler(client, message);

  } catch (error) {
    console.log("Erro:", error.message);
  }
});

client.initialize();