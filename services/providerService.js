const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/services.json");

function getData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function getProvidersByService(service) {
  const data = getData();
  const providers = data[service] || [];

  // 🔥 ordenar do maior para o menor
  return providers.sort((a, b) => b.media - a.media);
}

module.exports = {
  getProvidersByService
};