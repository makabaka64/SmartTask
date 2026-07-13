const express = require('express');
const router = express.Router();
const agentHandler = require('../router_handler/agent');

router.post('/stream', agentHandler.streamAgent);
router.post('/confirm-drafts', agentHandler.confirmDrafts);

module.exports = router;
