const express = require('express');
const router = express.Router();
const apiAuth = require('../middleware/middleware.apiAuth')
const Customer = require('../Controllers/Controller.Customer');
const { storeCallback } = require('../Controllers/Controller.Callback');

router.post('/store-customer', Customer);
router.post('/hutch/callback' , storeCallback);


module.exports = router;
