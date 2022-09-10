const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    'name': String,
    'email': String,
    'mobile': String,
    'orders': [{type: mongoose.Types.ObjectId, ref: 'Order'}]
});

module.exports = mongoose.model('User', userSchema);