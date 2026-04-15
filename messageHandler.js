const serviceService = require("./services/serviceService");
const providerService = require("./services/providerService");
const ratingService = require("./services/ratingService");
const leadService = require("./services/leadService");

const estados = {};

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

module.exports = async (client, message) => {
  const user = message.from;
  const text = message.body.trim();
  const textoNormalizado = normalizar(text);

  if (!estados[user]) {
    estados[user] = { etapa: "menu" };
  }

  const estado = estados[user];

  // =========================
  // MENU
  // =========================
  const saudacoes = ["oi", "ola", "bom dia", "boa tarde", "boa noite"];
  if (text === "/menu" || saudacoes.includes(textoNormalizado)) {
    const services = serviceService.getAllServices();

    let msg = "📋 *Serviços disponíveis:*\n\n";

    services.forEach((s, i) => {
      msg += `${i + 1} - ${s}\n`;
    });

    msg += "\nDigite o número do serviço:\n\n";
    msg += "Digite *0* - Cadastrar meu serviço\n";

    estado.etapa = "escolhendo_servico";

    return message.reply(msg);
  }

  // =========================
  // SAIR (GLOBAL)
  // =========================
  const comandosSair = ["sair", "cancelar", "voltar", "menu"];

  if (comandosSair.includes(textoNormalizado)) {
    estado.etapa = "menu";

    const services = serviceService.getAllServices();

    let msg = "📋 *Serviços disponíveis:*\n\n";

    services.forEach((s, i) => {
      msg += `${i + 1} - ${s}\n`;
    });

    msg += "\nDigite o número do serviço:\n";
    msg += "0 - Cadastrar meu serviço\n";

    return message.reply(msg);
  }

  // =========================
  // ESCOLHER SERVIÇO
  // =========================
  if (estado.etapa === "escolhendo_servico") {

    // 👉 CADASTRO
    if (text === "0") {
      const services = serviceService.getAllServices();

      let msg = "Qual serviço você presta?\n\n";

      services.forEach((s, i) => {
        msg += `${i + 1} - ${s}\n`;
      });

      estado.etapa = "cad_servico";
      return message.reply(msg);
    }

    const services = serviceService.getAllServices();
    const index = parseInt(text) - 1;

    if (!services[index]) {
      return message.reply("❌ Serviço inválido");
    }

    estado.servico = services[index];
    estado.etapa = "filtro_bairro";

    // leadService.salvarLead({
    //   user,
    //   servico: estado.servico
    // });

    return message.reply(
      "📍 Digite o bairro que deseja buscar\n\nOu digite *TODOS*:"
    );
  }

  // =========================
  // FILTRO POR BAIRRO
  // =========================
  if (estado.etapa === "filtro_bairro") {
    const bairroOriginal = text;
    const bairro = normalizar(text);

    // ✅ salvar no estado (IMPORTANTE)
    estado.bairro = bairro;

    // 🔥 salvar lead
    const leadService = require("./services/leadService");

    leadService.salvarLead({
      user,
      servico: estado.servico,
      bairro: bairroOriginal
    });

    const providers = providerService.getProvidersByService(
      estado.servico,
      bairro
    );

    if (!providers.length) {
      estado.etapa = "menu";
      return message.reply("❌ Nenhum prestador encontrado\nDigite /menu");
    }

    let msg = `🧵 *${estado.servico.toUpperCase()}*\n`;
    msg += `📍 Bairro: ${bairroOriginal}\n\n`;

    providers.forEach((p, i) => {
      const total = ratingService.getQuantidadeAvaliacoes(p.id);

      msg += `${i + 1} - ${p.nome}
  📞 ${p.telefone}
  📍 ${p.bairro}
  ⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total} avaliações)

  `;
    });

    msg += "Digite:\n";
    msg += "1 - Avaliar prestador\n";
    msg += "0 - Voltar ao menu";

    estado.etapa = "lista_prestadores";

    return message.reply(msg);
  }

  // =========================
  // LISTA PRESTADORES
  // =========================
  if (estado.etapa === "lista_prestadores") {
    if (text === "0") {
      estado.etapa = "menu";
      return message.reply("Digite /menu");
    }

    if (text === "1") {
      const providers = providerService.getProvidersByService(
        estado.servico,
        estado.bairro
      );

      let msg = "Escolha o prestador:\n";

      providers.forEach((p, i) => {
        msg += `${i + 1} - ${p.nome}\n`;
      });

      estado.etapa = "escolher_prestador";
      return message.reply(msg);
    }
  }

  // =========================
  // ESCOLHER PRESTADOR
  // =========================
  if (estado.etapa === "escolher_prestador") {
    const providers = providerService.getProvidersByService(
      estado.servico,
      estado.bairro
    );

    const index = parseInt(text) - 1;

    if (!providers[index]) {
      return message.reply("❌ Opção inválida");
    }

    estado.prestador = providers[index];
    estado.etapa = "avaliar";

    return message.reply("Digite uma nota de 1 a 5 ⭐");
  }

  // =========================
  // AVALIAR
  // =========================
  if (estado.etapa === "avaliar") {
    const nota = parseInt(text);

    if (nota < 1 || nota > 5) {
      return message.reply("Nota inválida (1 a 5)");
    }

    const podeAvaliar = ratingService.podeAvaliar(
      user,
      estado.prestador.id
    );

    if (!podeAvaliar) {
      estado.etapa = "menu";
      return message.reply("⚠️ Você já avaliou este mês\nDigite /menu");
    }

    ratingService.salvarAvaliacao(
      user,
      estado.prestador.id,
      nota
    );

    estado.etapa = "menu";

    return message.reply("✅ Avaliação registrada!\nDigite /menu");
  }

  // =========================
  // CADASTRO - SERVIÇO
  // =========================
  if (estado.etapa === "cad_servico") {
    const services = serviceService.getAllServices();
    const index = parseInt(text) - 1;

    if (!services[index]) {
      return message.reply("❌ Serviço inválido");
    }

    estado.novo = {};
    estado.novo.servico = services[index];

    estado.etapa = "cad_nome";

    return message.reply("Digite seu nome ou empresa:");
  }

  // =========================
  // CADASTRO - NOME
  // =========================
  if (estado.etapa === "cad_nome") {
    estado.novo.nome = message.body;

    estado.etapa = "cad_telefone";
    return message.reply("Digite seu telefone:");
  }

  // =========================
  // CADASTRO - TELEFONE
  // =========================
  if (estado.etapa === "cad_telefone") {
    estado.novo.telefone = message.body;

    estado.etapa = "cad_bairro";
    return message.reply("Digite seu bairro:");
  }

  // =========================
  // CADASTRO - INSTAGRAM
  // =========================
  // if (estado.etapa === "cad_instagram") {
  //   estado.novo.instagram = message.body;

  //   estado.etapa = "cad_bairro";
  //   return message.reply("Digite seu bairro:");
  // }

  // =========================
  // CADASTRO - BAIRRO
  // =========================
  if (estado.etapa === "cad_bairro") {
    estado.novo.bairro = message.body;

    const result = providerService.salvarProvider(
      estado.novo.servico,
      {
        nome: estado.novo.nome,
        telefone: estado.novo.telefone,
        //instagram: estado.novo.instagram,
        bairro: estado.novo.bairro,
        descricao: ""
      }
    );

    estado.etapa = "menu";

    if (result?.erro) {
      return message.reply(result.mensagem + "\nDigite /menu");
    }

    return message.reply("✅ Cadastro realizado com sucesso!\nDigite /menu");
  }
};