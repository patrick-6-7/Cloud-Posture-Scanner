const logger = require('../utils/logger.js');
const mongoose = require("mongoose");

class DBLoader {
    async loadDatabase(link) {
        await mongoose.connect(link)
        logger.info("MongoDB connected \n")
    }
}

module.exports = new DBLoader();