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

function gerarLinkWhatsApp(telefone, nomePrestador, servico) {
  const numero = telefone.replace(/\D/g, "");

  const mensagem = encodeURIComponent(
    `chatBot.caruaru.servicos. Olá ${nomePrestador}.`
  );

  return `https://wa.me/55${numero}?text=${mensagem}`;
}

function gerarLinkSuporte() {
  const numero = "5581992155410";

  const mensagem = encodeURIComponent(
    "Olá, vim pelo chatbot de serviços de Caruaru e preciso de ajuda."
  );

  return `https://wa.me/${numero}?text=${mensagem}`;
}

// 🔥 PAGINAÇÃO
function listarPagina(estado) {
  const inicio = estado.pagina * 5;
  const fim = inicio + 5;
  return estado.providers.slice(inicio, fim);
}

module.exports = async (client, message) => {
  try {
    const user = message.from;
    const text = message.body.trim();
    const textoNormalizado = normalizar(text);

    if (!estados[user]) {
      estados[user] = { etapa: "menu" };
    }

    const estado = estados[user];

    console.log("USER:", user);
    console.log("ETAPA:", estado.etapa);
    console.log("MSG:", text);

    // =========================
    // MENU
    // =========================
    const saudacoes = ["oi", "ola", "bom dia", "boa tarde", "boa noite"];

    if (
      text === "/menu" ||
      saudacoes.includes(textoNormalizado) ||
      estado.etapa === "menu"
    ) {
      const services = serviceService.getAllServices();

      let msg = "📋 *Serviços disponíveis:*\n\n";

      services.forEach((s, i) => {
        msg += `${i + 1} - ${s}\n`;
      });

      msg += "\nDigite o número do serviço:\n\n";
      msg += "0 - Cadastrar meu serviço\n";
      msg += "duvida - Suporte\n";
      msg += "sair - Menu\n";

      estado.etapa = "escolhendo_servico";

      return message.reply(msg);
    }

    // =========================
    // SAIR GLOBAL
    // =========================
    const comandosSair = ["sair", "cancelar", "voltar"];

    if (comandosSair.includes(textoNormalizado)) {
      estado.etapa = "menu";
      return message.reply("Digite /menu");
    }

    // =========================
    // ESCOLHER SERVIÇO
    // =========================
    if (estado.etapa === "escolhendo_servico") {
      if (textoNormalizado === "duvida") {
        const link = gerarLinkSuporte();

        return message.reply(
          `💬 *Suporte*\n\nFale conosco:\n${link}`
        );
      }

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

      return message.reply(
        "📍 Digite o bairro ou *TODOS*:"
      );
    }

    // =========================
    // FILTRO BAIRRO
    // =========================
    if (estado.etapa === "filtro_bairro") {
      const bairroOriginal = text;
      const bairro = normalizar(text);

      estado.bairro = bairro;

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
        return message.reply("❌ Nenhum encontrado\nDigite /menu");
      }

      estado.providers = providers;
      estado.pagina = 0;

      const lista = listarPagina(estado);

      let msg = `🧵 *${estado.servico.toUpperCase()}*\n`;
      msg += `📍 ${bairroOriginal}\n\n`;

      lista.forEach((p) => {
        const total = ratingService.getQuantidadeAvaliacoes(p.id);
        const link = gerarLinkWhatsApp(p.telefone, p.nome, estado.servico);

        msg += `━━━━━━━━━━━━━━━
👤 *${p.nome}*
📍 ${p.bairro}
⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total})
📲 ${link}
━━━━━━━━━━━━━━━

`;
      });

      msg += "1 - Avaliar\n9 - Próximo\n0 - Menu";

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

      if (text === "9") {
        estado.pagina++;

        const lista = listarPagina(estado);

        if (!lista.length) {
          estado.pagina--;
          return message.reply("⚠️ Não há mais resultados");
        }

        let msg = `🧵 *${estado.servico.toUpperCase()}*\n\n`;

        lista.forEach((p) => {
          const total = ratingService.getQuantidadeAvaliacoes(p.id);
          const link = gerarLinkWhatsApp(p.telefone, p.nome, estado.servico);

          msg += `━━━━━━━━━━━━━━━
👤 *${p.nome}*
📍 ${p.bairro}
⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total})
📲 ${link}
━━━━━━━━━━━━━━━

`;
        });

        msg += "1 - Avaliar\n9 - Próximo\n0 - Menu";

        return message.reply(msg);
      }

      if (text === "1") {
        const lista = listarPagina(estado);

        let msg = "Escolha o prestador:\n";

        lista.forEach((p, i) => {
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
      const lista = listarPagina(estado);
      const index = parseInt(text) - 1;

      if (!lista[index]) {
        return message.reply("❌ Opção inválida");
      }

      estado.prestador = lista[index];
      estado.etapa = "avaliar";

      return message.reply("Nota de 1 a 5 ⭐");
    }

    // =========================
    // AVALIAR
    // =========================
    if (estado.etapa === "avaliar") {
      const nota = parseInt(text);

      if (nota < 1 || nota > 5) {
        return message.reply("Nota inválida");
      }

      const pode = ratingService.podeAvaliar(
        user,
        estado.prestador.id
      );

      if (!pode) {
        estado.etapa = "menu";
        return message.reply("⚠️ Já avaliou\nDigite /menu");
      }

      ratingService.salvarAvaliacao(
        user,
        estado.prestador.id,
        nota
      );

      estado.etapa = "menu";

      return message.reply("✅ Avaliado!\nDigite /menu");
    }

    // =========================
    // CADASTRO
    // =========================
    if (estado.etapa === "cad_servico") {
      const services = serviceService.getAllServices();
      const index = parseInt(text) - 1;

      if (!services[index]) {
        return message.reply("❌ Serviço inválido");
      }

      estado.novo = { servico: services[index] };
      estado.etapa = "cad_nome";

      return message.reply("Nome:");
    }

    if (estado.etapa === "cad_nome") {
      estado.novo.nome = message.body;
      estado.etapa = "cad_telefone";
      return message.reply("Telefone:");
    }

    if (estado.etapa === "cad_telefone") {
      estado.novo.telefone = message.body;
      estado.etapa = "cad_bairro";
      return message.reply("Bairro:");
    }

    if (estado.etapa === "cad_bairro") {
      estado.novo.bairro = message.body;

      const result = providerService.salvarProvider(
        estado.novo.servico,
        {
          nome: estado.novo.nome,
          telefone: estado.novo.telefone,
          bairro: estado.novo.bairro,
          descricao: ""
        }
      );

      estado.etapa = "menu";

      if (result?.erro) {
        return message.reply(result.mensagem);
      }

      return message.reply("✅ Cadastrado!\nDigite /menu");
    }

    // =========================
    // FALLBACK
    // =========================
    return message.reply("❌ Não entendi\nDigite /menu");

  } catch (err) {
    console.error("ERRO NO BOT:", err);
    return message.reply("⚠️ Erro interno");
  }
};