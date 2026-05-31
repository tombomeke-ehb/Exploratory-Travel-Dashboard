const cds = require('@sap/cds');
const path = require('path');
const fs = require('fs');

cds.on('bootstrap', (app) => {
  // Zoek index.html op — in productie staat het als app-index.html naast server.js
  const prodPath = path.join(__dirname, 'app-index.html');
  const devPath  = path.join(__dirname, 'app', 'index.html');
  const indexPath = fs.existsSync(prodPath) ? prodPath : devPath;

  if (fs.existsSync(indexPath)) {
    app.get('/', (_req, res) => res.sendFile(indexPath));
  }
});

module.exports = cds.server;
