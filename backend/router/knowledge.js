const express = require('express');
const router = express.Router();
const knowledgeHandler = require('../router_handler/knowledge');

router.get('/list', knowledgeHandler.getKnowledgeList);
router.post('/create', knowledgeHandler.createKnowledge);
router.post('/update/:id', knowledgeHandler.updateKnowledge);
router.delete('/delete/:id', knowledgeHandler.removeKnowledge);

module.exports = router;
