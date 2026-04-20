const serviceService = require("./services/serviceService");
const providerService = require("./services/providerService");
const ratingService = require("./services/ratingService");
const leadService = require("./services/leadService");

const estados = {};
const SUPORTE = "5581992155410@c.us";

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

function gerarLinkWhatsApp(telefone) {
  const numero = telefone.replace(/\D/g, "");
  return `https://wa.me/55${numero}`;
}

function gerarLinkSuporte() {
  return "https://wa.me/5581992155410";
}

async function enviarSuporte(client, message, textoErro) {
  await message.reply(
`⚠️ Não consegui concluir sua solicitação.

💬 Suporte humano:
📞 (81) 99215-5410
${gerarLinkSuporte()}

Digite *menu* para voltar.`
  );

  await client.sendMessage(
    SUPORTE,
`📩 Usuário com dificuldade

Número: ${message.from}
Mensagem: ${textoErro}`
  );
}

function listarPagina(estado) {
  const inicio = estado.pagina * 5;
  const fim = inicio + 5;
  return estado.providers.slice(inicio, fim);
}

function detectarServico(texto) {
  const services = serviceService.getAllServices();
  const t = normalizar(texto);

  return services.find((s) =>
    t.includes(normalizar(s))
  );
}

// ====================================
// MENU PRINCIPAL
// ====================================
function menuPrincipal() {
  return `
🚀 *BUSCACARUARU - CHAT DE SERVIÇOS*

Encontre profissionais de forma rápida em Caruaru e região.

✅ Costureiras
✅ Travete
✅ Facção
✅ Frete
✅ Bordado
✅ Frente / Traseira
✅ Corte / Cós
✅ Fabricantes
✅ E muito mais

🎯 Benefícios:

✔ Contato direto no WhatsApp
✔ Prestadores avaliados
✔ Busca por bairro
✔ Cadastro grátis para trabalhar
✔ Mais clientes para você

📲 Digite o que precisa normalmente:

Ex:
frete
travete
costureira
quero facção

📋 Comandos:
menu
categorias
cadastrar
avaliar
suporte

💬 Se tiver dificuldade, digite *suporte*.
💬 Digite *categorias* para ver todos os serviços*.
💬 Digite *menu* para acessar o menu principal.
💬 Digite *cadastrar* para cadastrar seu serviço.
`;
}

function listarServicosTexto() {
  const services = serviceService.getAllServices();

  let msg = "📋 *Serviços disponíveis:*\n\n";

  services.forEach((s) => {
    msg += `• ${s}\n`;
  });

  msg += "\nDigite o nome do serviço desejado.";
  msg += "\nSe precisar de ajuda digite *suporte*.";

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
      estados[user] = {
        etapa: "inicio",
        erros: 0
      };
    }

    const estado = estados[user];

    // ====================================
    // MENU GLOBAL
    // ====================================
    const gatilhosMenu = [
      "oi",
      "ola",
      "olá",
      "bom dia",
      "boa tarde",
      "boa noite",
      "menu",
      "/menu",
      "inicio",
      "voltar",
      "cancelar"
    ];

    if (gatilhosMenu.includes(texto)) {
      estado.etapa = "inicio";
      estado.erros = 0;
      return message.reply(menuPrincipal());
    }

    // ====================================
    // SUPORTE GLOBAL
    // ====================================
    if (
      texto.includes("suporte") ||
      texto.includes("ajuda") ||
      texto.includes("duvida") ||
      texto.includes("dúvida")
    ) {
      return message.reply(
`💬 *SUPORTE BUSCACARUARU*

Fale conosco:
📞 (81) 99215-5410
${gerarLinkSuporte()}

Explique sua dúvida que ajudamos você.`
      );
    }

    // ====================================
    // INICIO
    // ====================================
    if (estado.etapa === "inicio") {

      // cadastro
      if (
        texto.includes("cadastro") ||
        texto.includes("cadastrar")
      ) {
        estado.etapa = "cad_servico";

        return message.reply(
`📝 Vamos cadastrar seu serviço.

Qual serviço você presta?

${listarServicosTexto()}`
        );
      }

      // avaliar
      if (texto.includes("avaliar")) {
        estado.etapa = "avaliar_busca";

        return message.reply(
          "⭐ Qual serviço do prestador que deseja avaliar?"
        );
      }

      // categorias
      if (
        texto.includes("categorias") ||
        texto.includes("lista") ||
        texto.includes("servicos") ||
        texto.includes("serviços")
      ) {
        return message.reply(listarServicosTexto());
      }

      // detectar serviço direto
      const servico = detectarServico(text);

      if (servico) {
        estado.servico = servico;
        estado.etapa = "filtro_bairro";

        return message.reply(
`📍 Você procura *${servico}*

Digite o bairro desejado ou *todos*.`
        );
      }

      return message.reply(menuPrincipal());
    }

    // ====================================
    // BUSCAR BAIRRO
    // ====================================
    if (estado.etapa === "filtro_bairro") {

      estado.bairro = text;

      leadService.salvarLead({
        user,
        servico: estado.servico,
        bairro: text
      });

      const providers =
        providerService.getProvidersByService(
          estado.servico,
          normalizar(text)
        );

      if (!providers.length) {
        estado.etapa = "inicio";

        return message.reply(
`❌ Nenhum prestador encontrado.

Digite outro bairro ou *menu*
Se precisar digite *suporte*.`
        );
      }

      estado.providers = providers;
      estado.pagina = 0;
      estado.etapa = "lista_prestadores";

      const lista = listarPagina(estado);

      let msg = `🔎 *${estado.servico.toUpperCase()}*\n`;
      msg += `📍 ${text}\n\n`;

      lista.forEach((p, i) => {
        const total =
          ratingService.getQuantidadeAvaliacoes(
            p.id
          );

        msg += `${i + 1}. 👤 *${p.nome}*
📍 ${p.bairro}
⭐ ${p.media ? p.media.toFixed(1) : "0.0"} (${total})
📲 ${gerarLinkWhatsApp(p.telefone)}

━━━━━━━━━━━━━━━

`;
      });

      msg += `Digite:
proximo
avaliar
menu`;

      return message.reply(msg);
    }

    // ====================================
    // LISTA
    // ====================================
    if (estado.etapa === "lista_prestadores") {

      if (texto === "proximo") {

        estado.pagina++;

        const lista = listarPagina(estado);

        if (!lista.length) {
          estado.pagina--;
          return message.reply(
            "⚠️ Não há mais resultados."
          );
        }

        let msg = "";

        lista.forEach((p, i) => {
          msg += `${i + 1}. ${p.nome}
📍 ${p.bairro}
📲 ${gerarLinkWhatsApp(p.telefone)}

`;
        });

        msg += "Digite proximo / avaliar / menu";

        return message.reply(msg);
      }

      if (texto === "avaliar") {

        const lista = listarPagina(estado);

        let msg =
          "⭐ Digite o número do prestador:\n\n";

        lista.forEach((p, i) => {
          msg += `${i + 1}. ${p.nome}\n`;
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
        await enviarSuporte(
          client,
          message,
          text
        );

        return;
      }

      estado.prestador = lista[index];
      estado.etapa = "avaliar_nota";

      return message.reply(
`⭐ Nota para ${estado.prestador.nome}

Digite de 1 até 5`
      );
    }

    // ====================================
    // AVALIAR NOTA
    // ====================================
    if (estado.etapa === "avaliar_nota") {

      const nota = parseInt(text);

      if (nota < 1 || nota > 5) {
        return message.reply(
          "❌ Nota inválida. Digite de 1 a 5."
        );
      }

      ratingService.salvarAvaliacao(
        user,
        estado.prestador.id,
        nota
      );

      estado.etapa = "inicio";

      return message.reply(
`✅ Avaliação registrada.

Digite *menu*`
      );
    }

    // ====================================
    // CADASTRO
    // ====================================
    if (estado.etapa === "cad_servico") {

      const servico = detectarServico(text);

      if (!servico) {
        return message.reply(
`❌ Serviço inválido.

Digite novamente ou digite *suporte*.`
        );
      }

      estado.novo = { servico };
      estado.etapa = "cad_nome";

      return message.reply(
        "👤 Digite seu nome:"
      );
    }

    if (estado.etapa === "cad_nome") {
      estado.novo.nome = text;
      estado.etapa = "cad_telefone";

      return message.reply(
        "📞 Digite seu telefone:"
      );
    }

    if (estado.etapa === "cad_telefone") {
      estado.novo.telefone = text;
      estado.etapa = "cad_bairro";

      return message.reply(
        "📍 Digite seu bairro:"
      );
    }

    if (estado.etapa === "cad_bairro") {

      estado.novo.bairro = text;

      const result =
        providerService.salvarProvider(
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
        return message.reply(
`❌ ${result.mensagem}

Digite *suporte* se precisar.`
        );
      }

      return message.reply(
`✅ Cadastro realizado com sucesso!

Agora clientes podem encontrar você.

Digite *menu*`
      );
    }

    // ====================================
    // FALLBACK
    // ====================================
    return message.reply(
`❌ Não entendi sua mensagem.

Digite *menu* para opções
ou *suporte* para ajuda.`
    );

  } catch (err) {
    console.error(err);

    return message.reply(
`⚠️ Erro interno no sistema.

Digite *menu* ou *suporte*.`
    );
  }
};