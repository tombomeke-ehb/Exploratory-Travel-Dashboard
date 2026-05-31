// Custom CAP server – serveert app/index.html op de root route
const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

cds.on('bootstrap', (app) => {
  // In productie (gen/srv) zit index.html in ../app relatief aan server.js
  // In development zit het in ./app
  const appDir = path.join(__dirname, 'app');

  app.get('/', (req, res) => {
    const indexPath = path.join(appDir, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        // Fallback: probeer relatief pad
        res.sendFile(path.join(__dirname, '..', 'app', 'index.html'), (err2) => {
          if (err2) res.status(404).send('index.html not found: ' + appDir);
        });
      }
    });
  });

  app.use(express.static(appDir));
});

module.exports = cds.server;
