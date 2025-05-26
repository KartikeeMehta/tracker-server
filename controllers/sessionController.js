const Session = require("../models/Session");

exports.getCurrentSession = async (req, res) => {
  const session = await Session.findOne({ userId: req.user.id, endTime: null });
  res.json(session);
};
