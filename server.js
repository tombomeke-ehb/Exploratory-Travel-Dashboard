// Custom CAP server – serveert app/index.html op de root route
const cds = require('@sap/cds');
const path = require('path');
const fs = require('fs');

cds.on('bootstrap', (app) => {
  const appDir = path.join(__dirname, 'app');

  if (fs.existsSync(path.join(appDir, 'index.html'))) {
    const express = require('express');
    app.use(express.static(appDir));
    app.get('/', (_req, res) => res.sendFile(path.join(appDir, 'index.html')));
  }
});

module.exports = cds.server;
