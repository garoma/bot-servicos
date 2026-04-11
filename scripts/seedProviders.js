const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/services.json");

function loadData() {
  return JSON.parse(fs.readFileSync(filePath));
}

function saveData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// gera ID automático
function getNextId(data) {
  let all = [];

  Object.values(data).forEach(list => {
    all = all.concat(list);
  });

  return all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
}

// adicionar prestador
function addProvider(data, service, provider) {
  if (!data[service]) {
    console.log(`❌ Serviço ${service} não existe`);
    return;
  }

  provider.id = getNextId(data);
  provider.media = 0;

  data[service].push(provider);
}

// ====== DADOS PARA INSERIR ======
function seed() {
  const data = loadData();

  addProvider(data, "fabricante", {
    nome: "Cilmara",
    telefone: "81991257099",
    instagram: "",
    endereco: "",
    bairro: "riachao",
    descricao: "Fabricante de Jeans"
  });

  addProvider(data, "frete", {
    nome: "frank - frete",
    telefone: "81992155410",
    instagram: "",
    endereco: "",
    bairro: "riachao",
    descricao: "Frete para Cortes, peças, facção, lavanderia, transportadora, etc"
  });

  saveData(data);
  console.log("✅ Prestadores adicionados!");
}

seed();