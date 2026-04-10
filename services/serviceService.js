const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/services.json");

function getAllServices() {
  const data = JSON.parse(fs.readFileSync(dataPath));
  return Object.keys(data);
}

module.exports = {
  getAllServices
};