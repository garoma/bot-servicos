const serviceService = require("./services/serviceService");
const providerService = require("./services/providerService");
const ratingService = require("./services/ratingService");

const estados = {};

module.exports = async (client, message) => {
  const user = message.from;
  const text = message.body.toLowerCase();

  if (!estados[user]) {
    estados[user] = { etapa: "menu" };
  }

  const estado = estados[user];
  const saudacoes = ["oi","ola","olá","bom dia","boa tarde","boa noite"];

  // MENU
  if (text === "/menu" || saudacoes.some(s => textoNormalizado.includes(s))){
    if (text === "/menu") {
      const services = serviceService.getAllServices();

      let msg = "📋 *Serviços disponíveis:*\n\n";

      services.forEach((s, i) => {
        msg += `${i + 1} - ${s}\n`;
      });

      msg += "\nDigite o número do serviço:\n\n";

      msg += "📢 *ATENÇÃO*\n";
      msg += "Se você presta algum desses serviços,\n";
      msg += "entre em contato:\n";
      msg += "📲 5581992155410\n";
      msg += "e seja cadastrado!\n";
      msg += "Seus serviços serão vistos por todos 🚀";

      estado.etapa = "escolhendo_servico";

      return message.reply(msg);
    }
  }

  // ESCOLHER SERVIÇO
  if (estado.etapa === "escolhendo_servico") {
    const services = serviceService.getAllServices();
    const index = parseInt(text) - 1;

    if (!services[index]) {
      return message.reply("❌ Serviço inválido");
    }

    const serviceName = services[index];
    estado.servico = serviceName;

    const providers = providerService.getProvidersByService(serviceName);

    let msg = `🧵 *${serviceName.toUpperCase()}*\n\n`;

    providers.forEach((p, i) => {
      const total = ratingService.getQuantidadeAvaliacoes(p.id);

      msg += `${i + 1} - ${p.nome}
    📞 ${p.telefone}
    📍 ${p.bairro}
    📸 ${p.instagram}
    ⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total} avaliações)

    `;
    });

    msg += "Digite:\n";
    msg += "1 - Avaliar prestador\n";
    msg += "0 - Voltar ao menu";

    estado.etapa = "lista_prestadores";

    return message.reply(msg);
  }

  // ESCOLHER AVALIAÇÃO
  if (estado.etapa === "lista_prestadores") {
    if (text === "0") {
      estado.etapa = "menu";
      return message.reply("Digite /menu");
    }

    if (text === "1") {
      const providers = providerService.getProvidersByService(estado.servico);

      let msg = "Escolha o prestador:\n";
      providers.forEach((p, i) => {
        msg += `${i + 1} - ${p.nome}\n`;
      });

      estado.etapa = "escolher_prestador";
      return message.reply(msg);
    }
  }

  // ESCOLHER PRESTADOR
  if (estado.etapa === "escolher_prestador") {
    const providers = providerService.getProvidersByService(estado.servico);
    const index = parseInt(text) - 1;

    if (!providers[index]) {
      return message.reply("❌ Inválido");
    }

    estado.prestador = providers[index];

    estado.etapa = "avaliar";
    return message.reply("Digite uma nota de 1 a 5 ⭐");
  }

  // AVALIAR
  if (estado.etapa === "avaliar") {
    const nota = parseInt(text);

    if (nota < 1 || nota > 5) {
      return message.reply("Nota inválida (1 a 5)");
    }

    const podeAvaliar = ratingService.podeAvaliar(user, estado.prestador.id);

    if (!podeAvaliar) {
      return message.reply("⚠️ Você já avaliou este mês");
    }

    ratingService.salvarAvaliacao(user, estado.prestador.id, nota);

    return message.reply("✅ Avaliação registrada!");
  }
};