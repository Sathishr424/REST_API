const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    'product_id': {type: mongoose.Types.ObjectId, ref: 'Product'},
    'qty' : Number
});

module.exports = mongoose.model('Order', orderSchema);