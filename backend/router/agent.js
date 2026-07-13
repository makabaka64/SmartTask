const express = require('express');
const router = express.Router();
const agentHandler = require('../router_handler/agent');

router.post('/stream', agentHandler.streamAgent);
router.post('/confirm-drafts', agentHandler.confirmDrafts);
router.get('/runs', agentHandler.getRuns);
router.get('/runs/:id', agentHandler.getRunDetail);
router.delete('/runs/:id', agentHandler.deleteRun);

module.exports = router;
