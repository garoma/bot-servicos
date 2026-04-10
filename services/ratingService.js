const fs = require("fs");
const path = require("path");
const { isSameMonth } = require("../utils/dateUtils");

const filePath = path.join(__dirname, "../storage/ratings.json");

function getRatings() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
}

function salvarAvaliacao(user, providerId, nota) {
  const ratings = getRatings();

  ratings.push({
    user,
    providerId,
    nota,
    data: new Date()
  });

  fs.writeFileSync(filePath, JSON.stringify(ratings, null, 2));
}

function podeAvaliar(user, providerId) {
  const ratings = getRatings();

  const jaAvaliou = ratings.find(r =>
    r.user === user &&
    r.providerId === providerId &&
    isSameMonth(new Date(r.data), new Date())
  );

  return !jaAvaliou;
}

function getQuantidadeAvaliacoes(providerId) {
  const ratings = getRatings();

  return ratings.filter(r => r.providerId === providerId).length;
}

module.exports = {
  salvarAvaliacao,
  podeAvaliar,
  getQuantidadeAvaliacoes
};