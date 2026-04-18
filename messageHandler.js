const serviceService = require("./services/serviceService");
const providerService = require("./services/providerService");
const ratingService = require("./services/ratingService");
const leadService = require("./services/leadService");

const estados = {};

// ====================================
// UTIL
// ====================================
function normalizar(texto = "") {
  return texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function gerarLinkWhatsApp(telefone, nome) {
  const numero = telefone.replace(/\D/g, "");

  const mensagem = encodeURIComponent(
    `Olá ${nome}, encontrei seu contato no *BuscaCaruaru*`
  );

  return `https://wa.me/55${numero}?text=${mensagem}`;
}

function gerarLinkSuporte() {
  return "https://wa.me/5581992155410";
}

function listarPagina(estado) {
  const inicio = estado.pagina * 5;
  const fim = inicio + 5;
  return estado.providers.slice(inicio, fim);
}

function detectarServico(texto) {
  const services = serviceService.getAllServices();
  const t = normalizar(texto);

  return services.find((s) => t.includes(normalizar(s)));
}

function menuPrincipal() {
  return `
👋 Olá! Sou o assistente virtual do *BuscaCaruaru* seu ChatBot de Serviços de Caruaru*.

Como posso ajudar?

🔎 Encontrar profissionais
📝 Cadastrar meu serviço
⭐ Avaliar prestador
📋 Ver categorias
💬 Falar com suporte

Digite normalmente 😊
Ex: "quero frete"
`;
}

function listarServicosTexto() {
  const services = serviceService.getAllServices();

  let msg = "📋 *Serviços disponíveis:*\n\n";

  services.forEach((s) => {
    msg += `• ${s}\n`;
  });

  msg += "\nDigite o nome do serviço desejado.";

  return msg;
}

// ====================================
// HANDLER
// ====================================
module.exports = async (client, message) => {
  try {
    const user = message.from;
    const text = message.body.trim();
    const texto = normalizar(text);

    if (!estados[user]) {
      estados[user] = { etapa: "inicio" };
    }

    const estado = estados[user];

    console.log("USER:", user);
    console.log("ETAPA:", estado.etapa);
    console.log("MSG:", text);

    // ====================================
    // COMANDOS GLOBAIS
    // ====================================
    const gatilhosMenu = [
      "oi",
      "ola",
      "bom dia",
      "boa tarde",
      "boa noite",
      "menu",
      "/menu",
      "inicio",
      "sair",
      "voltar",
      "cancelar"
    ];

    if (gatilhosMenu.includes(texto)) {
      estado.etapa = "inicio";
      return message.reply(menuPrincipal());
    }

    // ====================================
    // ETAPA INICIAL
    // ====================================
    if (estado.etapa === "inicio") {
      // buscar serviço
      if (
        texto.includes("buscar servico") ||
        texto.includes("buscar serviço") ||
        texto.includes("procurar servico") ||
        texto.includes("procurar serviço") ||
        texto.includes("achar servico") ||
        texto.includes("achar serviço")
      ) {
        estado.etapa = "buscar_servico";
        return message.reply(
          "🔎 Qual serviço você procura?\n\n" +
          listarServicosTexto()
        );
      }      

      // suporte
      if (
        texto.includes("suporte") ||
        texto.includes("duvida") ||
        texto.includes("ajuda")
      ) {
        return message.reply(
          `💬 Fale conosco:\n${gerarLinkSuporte()}`
        );
      }

      // cadastro
      if (
        texto.includes("cadastro") ||
        texto.includes("cadastrar") ||
        texto.includes("me cadastrar")
      ) {
        estado.etapa = "cad_servico";
        return message.reply(
          "📝 Vamos cadastrar você.\n\nQual serviço você presta?\n\n" +
          listarServicosTexto()
        );
      }

      // avaliar
      if (texto.includes("avaliar")) {
        estado.etapa = "avaliar_busca";
        return message.reply(
          "⭐ Qual serviço do prestador que deseja avaliar?\nEx: fabricante, frete..."
        );
      }

      // ver lista
      if (
        texto.includes("lista") ||
        texto.includes("servicos") ||
        texto.includes("categorias")
      ) {
        return message.reply(listarServicosTexto());
      }

      // detectar serviço direto
      const servicoDetectado = detectarServico(texto);

      if (servicoDetectado) {
        estado.servico = servicoDetectado;
        estado.etapa = "filtro_bairro";

        return message.reply(
          `🔎 Você procura *${servicoDetectado}*.\n\nDigite o bairro desejado ou *todos*.`
        );
      }

      return message.reply(menuPrincipal());
    }

    if (estado.etapa === "buscar_servico") {
      const servico = detectarServico(text);

      if (!servico) {
        return message.reply(
          "❌ Serviço não encontrado.\nDigite novamente.\n\n" +
          listarServicosTexto()
        );
      }

      estado.servico = servico;
      estado.etapa = "filtro_bairro";

      return message.reply(
        `📍 Qual bairro deseja buscar *${servico}*?\nDigite o bairro ou *todos*.`
      );
    }

    // ====================================
    // FILTRO BAIRRO
    // ====================================
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
        estado.etapa = "inicio";
        return message.reply(
          "❌ Nenhum prestador encontrado.\nDigite *menu*."
        );
      }

      estado.providers = providers;
      estado.pagina = 0;

      const lista = listarPagina(estado);

      let msg = `🔎 *${estado.servico.toUpperCase()}*\n`;
      msg += `📍 ${bairroOriginal}\n\n`;

      lista.forEach((p) => {
        const total = ratingService.getQuantidadeAvaliacoes(p.id);
        const link = gerarLinkWhatsApp(p.telefone, p.nome);

        msg += `👤 *${p.nome}*
📍 ${p.bairro}
⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total})
📲 ${link}
━━━━━━━━━━━━━━━

`;
      });

      msg += "Digite:\n";
      msg += "proximo - Mais resultados\n";
      msg += "avaliar - Avaliar prestador\n";
      msg += "menu - Voltar";

      estado.etapa = "lista_prestadores";

      return message.reply(msg);
    }

    // ====================================
    // LISTA PRESTADORES
    // ====================================
    if (estado.etapa === "lista_prestadores") {
      if (texto === "proximo") {
        estado.pagina++;

        const lista = listarPagina(estado);

        if (!lista.length) {
          estado.pagina--;
          return message.reply("⚠️ Não há mais resultados.");
        }

        let msg = `🔎 *${estado.servico.toUpperCase()}*\n\n`;

        lista.forEach((p) => {
          const total = ratingService.getQuantidadeAvaliacoes(p.id);
          const link = gerarLinkWhatsApp(p.telefone, p.nome);

          msg += `━━━━━━━━━━━━━━━
👤 *${p.nome}*
📍 ${p.bairro}
⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total})
📲 ${link}
━━━━━━━━━━━━━━━

`;
        });

        msg += "Digite:\nproximo\navaliar\nmenu";

        return message.reply(msg);
      }

      if (texto === "avaliar") {
        const lista = listarPagina(estado);

        let msg = "⭐ Escolha o prestador:\n\n";

        lista.forEach((p, i) => {
          msg += `${i + 1} - ${p.nome}\n`;
        });

        estado.etapa = "escolher_prestador";
        return message.reply(msg);
      }

      return message.reply(
        "Digite *proximo*, *avaliar* ou *menu*."
      );
    }

    // ====================================
    // ESCOLHER PRESTADOR
    // ====================================
    if (estado.etapa === "escolher_prestador") {
      const lista = listarPagina(estado);
      const index = parseInt(text) - 1;

      if (!lista[index]) {
        return message.reply("❌ Opção inválida.");
      }

      estado.prestador = lista[index];
      estado.etapa = "avaliar_nota";

      return message.reply(
        `⭐ Nota para ${estado.prestador.nome} (1 a 5):`
      );
    }

    // ====================================
    // AVALIAR BUSCA
    // ====================================
    if (estado.etapa === "avaliar_busca") {
      const servico = detectarServico(text);

      if (!servico) {
        return message.reply(
          "❌ Serviço não encontrado.\nDigite novamente."
        );
      }

      estado.servico = servico;
      estado.etapa = "filtro_bairro";

      return message.reply(
        `📍 Qual bairro do prestador de *${servico}*?`
      );
    }

    // ====================================
    // AVALIAR NOTA
    // ====================================
    if (estado.etapa === "avaliar_nota") {
      const nota = parseInt(text);

      if (nota < 1 || nota > 5) {
        return message.reply("❌ Nota inválida.");
      }

      const pode = ratingService.podeAvaliar(
        user,
        estado.prestador.id
      );

      if (!pode) {
        estado.etapa = "inicio";
        return message.reply(
          "⚠️ Você já avaliou este mês.\nDigite *menu*."
        );
      }

      ratingService.salvarAvaliacao(
        user,
        estado.prestador.id,
        nota
      );

      estado.etapa = "inicio";

      return message.reply(
        "✅ Avaliação registrada!\nDigite *menu*."
      );
    }

    // ====================================
    // CADASTRO
    // ====================================
    if (estado.etapa === "cad_servico") {
      const servico = detectarServico(text);

      if (!servico) {
        return message.reply(
          "❌ Serviço inválido.\nDigite novamente."
        );
      }

      estado.novo = { servico };
      estado.etapa = "cad_nome";

      return message.reply("Digite seu nome:");
    }

    if (estado.etapa === "cad_nome") {
      estado.novo.nome = text;
      estado.etapa = "cad_telefone";

      return message.reply("Digite seu telefone:");
    }

    if (estado.etapa === "cad_telefone") {
      estado.novo.telefone = text;
      estado.etapa = "cad_bairro";

      return message.reply("Digite seu bairro:");
    }

    if (estado.etapa === "cad_bairro") {
      estado.novo.bairro = text;

      const result = providerService.salvarProvider(
        estado.novo.servico,
        {
          nome: estado.novo.nome,
          telefone: estado.novo.telefone,
          bairro: estado.novo.bairro,
          descricao: ""
        }
      );

      estado.etapa = "inicio";

      if (result?.erro) {
        return message.reply("❌ " + result.mensagem);
      }

      return message.reply(
        "✅ Cadastro realizado com sucesso!\nDigite *menu*."
      );
    }

    // ====================================
    // FALLBACK
    // ====================================
    return message.reply(menuPrincipal());

  } catch (err) {
    console.error("ERRO NO BOT:", err);
    return message.reply("⚠️ Erro interno.");
  }
};