const express = require("express");
const router = express.Router();
const { getAgenciesOptions } = require("../controllers/agenciesController");

router.get("/options", getAgenciesOptions);

module.exports = router;
