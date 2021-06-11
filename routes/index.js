var express = require('express');
var router = express.Router();

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Paperfile project' });
});

module.exports = router;
