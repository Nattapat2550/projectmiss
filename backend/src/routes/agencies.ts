import express from "express";
const router = express.Router();
import {  getAgenciesOptions  } from "../controllers/agenciesController";

router.get("/options", getAgenciesOptions);

export default router;
