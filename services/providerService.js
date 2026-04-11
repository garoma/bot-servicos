const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/services.json");
const ratingService = require("./ratingService");

function getData() {
  return JSON.parse(fs.readFileSync(dataPath));
}

function getProvidersByService(service) {
  const data = getData();
  const providers = data[service] || [];

  const lista = providers.map(p => {
    const media = ratingService.getMediaAvaliacoes(p.id);

    return {
      ...p,
      media
    };
  });

  return lista.sort((a, b) => b.media - a.media);
}

module.exports = {
  getProvidersByService
};