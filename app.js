require("dotenv").config();
require('./config/database').connect();
const express     = require('express');
const bodyParser  = require('body-parser');

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const User = require('./model/user');
const Product = require('./model/product');
const Order = require('./model/order');

const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
};

const validateMobile = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^\d{9}\d$/
      );
};

app.get('/', (req,res) => {
    res.send("Please use '/user' to make requests...");
});

app.post('/user', (req,res) => {
    const { name, email, mobile } = req.body;
    console.log(req.body);

    if (!(name, email, mobile)){
        return res.status(400).send({'error': 'Please pass all the required fields to create a new user'})
    }

    if (name.length < 3) return res.status(400).send({'error': 'User name must be atleast 3 characters length!'})

    if (!validateEmail(email)){
        return res.status(400).send({'error': 'Please check your email!'})
    }
    if (!validateMobile(mobile)){
        return res.status(400).send({'error': 'Please check your mobile number! It will be a 10 digit number'})
    }

    User.findOne( {$or: [{name: name}, {email: email}, {mobile:mobile}]} ).exec((err, user) => {
        if (err) return res.json({'error': err});
        else if (user) return res.status(409).json({'error':"User already exist!"});
        else{
            User.create( req.body , (err, data) => {
                if (err) res.json({'error': err});
                if (data){
                    res.status(201).json(data);
                }
            });
        }
    });
})

app.post('/product', async (req,res) => {
    const { name, price, color, size, brand } = req.body;
    console.log(req.body);

    if (!(name, price, color, size, brand)){
        return res.status(400).send({'error': 'Please pass all the required fields to create a new product'})
    }

    Product.findOne( {name} ).exec((err, product) => {
        if (err) return res.json({'error': err});
        else if (product) return res.status(409).json({'error':"Product already exist!"});
        else{
            Product.create( { name: name, price: price, color: color, size: size, brand: brand }, (err, data) => {
                if (err) return res.json({'error': err});
                else if (data){
                    return res.status(201).json(data);
                }
            });
        }
    });
})

app.post('/order', async (req,res) => {
    const { user_id, product_id, qty } = req.body;

    if (!(user_id, product_id, qty)){
        return res.status(400).send({'error': 'Please pass all the required fields to place a order'})
    }
    try{

        const user = await User.findOne( {_id: user_id} );
        if (!user) return res.status(409).json({'error':"User does not exist!"});

        const product = await Product.findOne( {_id: product_id} );
        if (!product) return res.status(409).json({'error':"Product does not exist!"});

        const order = await Order.findOne( {product_id: product_id} );
        if (!order) {
            Order.create( {product_id: product_id, qty: qty} , (e, d) => {
                if (e) res.json({'error': e});
                if (d) {
                    user.orders.push(d._id);
                    user.markModified('info');
                    user.save((e,ret)=>{
                        if (e) {
                            console.log(err);
                            res.status(409).send({"error": "something went wrong while placing order"})
                        }else if (ret){
                            res.status(201).json(d);
                        } 
                        else{
                            res.status(409).send({"error": "something went wrong while placing user"})
                        }
                    })
                }
                else{
                    res.status(400).json(
                        {"error": "Something went wrong, can't place the order"}
                    );
                }
            })
        }else{
            Order.findOneAndUpdate({product_id: product_id}, {$set: {'qty': order.qty+parseInt(qty)}}, {new: true}, (err,data) => {
                if (err){
                    res.status(400).json({
                        error: err
                    });
                }else if(data){
                    res.status(201).json(data);
                }else{
                    res.status(400).json(
                        {"error": "Something went wrong, can't place the order"}
                    );
                }
            });
        }
    }catch (err) {
        console.log(err);
        res.json({'error': err});
    }
})

app.get('/orders/:user_id', async (req, res) => {
    console.log(req.params)
    var user_id = req.params.user_id;
    try{
        const user = await User.findOne( {_id: user_id} );
        if (!user) return res.status(409).json({'error':"User does not exist!"});
        else{
            user.populate('orders')
                .then(p => res.status(201).json(user.orders))
                .catch(e=> res.json({'error': e}));
        }
    }catch (err) {
        console.log(err);
        res.json({'error': err});
    }
})
const PER_PAGE = 50;
app.get('/users/search/:key/:page', async (req, res) => {
    let key = req.params.key;
    let page = null;
    try{
        page = parseInt(req.params.page);
    }catch (err) {
        console.log(err);
        res.json({'error': err});
    }
    console.log(key, page)

    User.find({$or: [ {name: {$regex: '.*' + key + '.*'}}, {email: {$regex: '.*' + key + '.*'}}, {mobile: {$regex: '.*' + key + '.*'}} ]}, (err, data) => {
        if (data) {
            if ( data.length <= (page-1)*PER_PAGE ){
                return res.status(400).json({'pageination_error': "Requested page can't be returned"});
            }
            return res.status(201).json({page: page, pages: Math.ceil(data.length/PER_PAGE), total_data: data.length, data: data.slice((page-1)*PER_PAGE, page*PER_PAGE)});
        }
        else if(err){
            return res.json({'error': err});
        }else{
            res.status(400).json(
                {"error": "Something went wrong"}
            );
        }
    })
})

app.get('/users/search/:key', async (req, res) => {
    let key = req.params.key;
    console.log(key)

    User.find({$or: [ {name: {$regex: '.*' + key + '.*'}}, {email: {$regex: '.*' + key + '.*'}}, {mobile: {$regex: '.*' + key + '.*'}} ]}, (err, data) => {
        if (data) {
            return res.status(201).json({page: 1, pages: Math.ceil(data.length/PER_PAGE), total_data: data.length, data: data.slice(0, PER_PAGE)});
        }
        else if(err){
            return res.json({'error': err});
        }else{
            res.status(400).json(
                {"error": "Something went wrong"}
            );
        }
    })
})

app.get('/products/filter', async (req, res) => {
    let query = req.query;
    console.log(query);
    let search = {}
    if ('brand' in query) search['brand'] = query.brand
    if ('size' in query) search['size'] = query.size
    if ('color' in query) search['color'] = query.color
    // console.log(search);
    Product.find(search, (err, data) => {
        if (data) {
            return res.status(201).json(data);
        }
        else if(err){
            return res.json({'error': err});
        }else{
            return res.status(400).json(
                {"error": "Something went wrong!"}
            );
        }
    })
})


module.exports = app;