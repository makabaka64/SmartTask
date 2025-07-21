const express = require("express");
const router = express.Router();
const handleStreamSummary = require('../router_handler/summary');

// SSE 实时摘要
router.get('/stream/:taskId', handleStreamSummary.handleStreamSummary);

module.exports = router;