const fs = require("fs");
const path = require("path");
const ratingService = require("./ratingService");

const dataPath = path.join(__dirname, "../data/services.json");

function getData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// 🔥 NORMALIZAR TEXTO (resolve acento)
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// =========================
// BUSCAR PRESTADORES
// =========================
function getProvidersByService(service, bairro = null) {
  const data = getData();
  let providers = data[service] || [];

  // 🔥 FILTRO POR BAIRRO
  if (bairro && normalizar(bairro) !== "todos") {
    providers = providers.filter(p =>
      normalizar(p.bairro).includes(normalizar(bairro))
    );
  }

  // 🔥 CALCULAR MÉDIA
  const lista = providers.map(p => {
    const media = ratingService.getMediaAvaliacoes(p.id);

    return {
      ...p,
      media
    };
  });

  // 🔥 ORDENAR MELHORES PRIMEIRO
  return lista.sort((a, b) => b.media - a.media);
}

// =========================
// SALVAR PRESTADOR
// =========================
function salvarProvider(service, provider) {
  const data = getData();

  if (!data[service]) {
    data[service] = [];
  }

  // 🚨 EVITAR DUPLICADO (telefone)
  const existe = data[service].find(p =>
    p.telefone === provider.telefone
  );

  if (existe) {
    return {
      erro: true,
      mensagem: "⚠️ Já existe cadastro com esse telefone"
    };
  }

  // gerar ID automático
  const todos = Object.values(data).flat();
  const novoId = todos.length
    ? Math.max(...todos.map(p => p.id)) + 1
    : 1;

  provider.id = novoId;
  provider.media = 0;

  data[service].push(provider);

  saveData(data);

  return { sucesso: true };
}

module.exports = {
  getProvidersByService,
  salvarProvider
};