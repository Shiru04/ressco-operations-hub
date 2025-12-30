const { ok } = require("../../shared/http/apiResponse");
const {
  productionOverview,
  productionQueues,
  productionUsers,
  ordersAnalytics,
} = require("./analytics.service");

async function getProductionOverview(req, res, next) {
  try {
    const data = await productionOverview(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getProductionQueues(req, res, next) {
  try {
    const data = await productionQueues(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getProductionUsers(req, res, next) {
  try {
    const data = await productionUsers(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

async function getOrdersAnalytics(req, res, next) {
  try {
    const data = await ordersAnalytics(req.query);
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProductionOverview,
  getProductionQueues,
  getProductionUsers,
  getOrdersAnalytics,
};
