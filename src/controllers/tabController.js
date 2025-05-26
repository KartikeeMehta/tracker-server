const Tab = require("../models/Tab");

const tabController = {
  getCurrentTab: async (req, res) => {
    console.log("getCurrentTab called");
    try {
      const tab = await Tab.findOne({ userId: req.user.id }).sort({
        timestamp: -1,
      });
      res.json(tab);
    } catch (error) {
      console.error("getCurrentTab error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getTabHistory: async (req, res) => {
    console.log("getTabHistory called");
    try {
      const tabs = await Tab.find({ userId: req.user.id }).sort({
        timestamp: -1,
      });
      res.json(tabs);
    } catch (error) {
      console.error("getTabHistory error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  updateTab: async (req, res) => {
    console.log("updateTab called");
    try {
      const tab = new Tab({
        userId: req.user.id,
        ...req.body,
      });
      await tab.save();
      res.json(tab);
    } catch (error) {
      console.error("updateTab error:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

console.log("tabController methods:", Object.keys(tabController));
module.exports = tabController;
