const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
    },
  });
};

exports.logout = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

exports.getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};
