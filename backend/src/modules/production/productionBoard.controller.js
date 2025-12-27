const { ok } = require("../../shared/http/apiResponse");
const { getBoard, updateBoard } = require("./productionBoard.service");

async function getProductionBoard(req, res, next) {
  try {
    const data = await getBoard();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function putProductionBoard(req, res, next) {
  try {
    const columns = req.body?.columns || [];
    const data = await updateBoard(columns);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getProductionBoard, putProductionBoard };
