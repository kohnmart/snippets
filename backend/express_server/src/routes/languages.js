import Router from "express-promise-router";
import languagesDB from "../db/languages.js";
import { isAuthorized, isNotAuthorized } from "../util/auth.js";
import { refreshToken } from "./auth.js";

const languages = Router();

//no authorization because you have to get these to display a post with the right syntaxhighlighting
languages.get("/", refreshToken, async (req, res) => {
  const { status, result } = await languagesDB.getLanguages(req.query.search);
  res.status(status).json(result);
});

languages.get("/:id", refreshToken, async (req, res) => {
  const { status, result } = await languagesDB.getLanguage(req.params.id);

  if (status === 200) {
    res.status(status).json(result);
  } else {
    res.sendStatus(status);
  }
});

export { languages };

export default { languages };
