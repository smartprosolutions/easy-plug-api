const { ratings: Rating } = require('../models');

async function listRatings(req, res, next) {
  try { const items = await Rating.findAll(); return res.json({ success: true, ratings: items }); } catch (err) { next(err); }
}

async function createRating(req, res, next) {
  try { const created = await Rating.create(req.body); return res.status(201).json({ success: true, rating: created }); } catch (err) { next(err); }
}

module.exports = { listRatings, createRating };
