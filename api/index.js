'use strict';
// Vercel serverless entry point: every request that isn't a static file in /public is
// rewritten here (see vercel.json) and handled by the Express app.
module.exports = require('../server').app;
