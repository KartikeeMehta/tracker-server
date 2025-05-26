const mongoose = require("mongoose");

// Import all models
require("./User");
require("./Company");
require("./Team");
require("./Project");
require("./Session");
require("./Task");
require("./Tab");

// Export mongoose instance
module.exports = mongoose;
