const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    'name': String,
    'price': Number,
    'color': String,
    'size': String,
    'brand': String
});

module.exports = mongoose.model('Product', productSchema);