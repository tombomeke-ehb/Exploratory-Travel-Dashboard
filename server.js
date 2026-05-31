// Custom CAP server – serveert app/index.html op de root route
const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

cds.on('bootstrap', (app) => {
  // Serveer app/index.html op /
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
  });

  // Serveer statische bestanden uit app/
  app.use(express.static(path.join(__dirname, 'app')));
});

module.exports = cds.server;
