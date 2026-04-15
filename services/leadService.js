const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../storage/leads.json");

function getLeads() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath));
}

function salvarLead(lead) {
  const leads = getLeads();

  leads.push({
    ...lead,
    data: new Date()
  });

  fs.writeFileSync(filePath, JSON.stringify(leads, null, 2));
}

module.exports = {
  salvarLead
};