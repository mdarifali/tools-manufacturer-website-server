const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_KEY);

app.use(cors());
app.use(express.json())

// Mongodb Connection //

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASS}@cluster0.eosns.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}




async function run() {

    try {
        await client.connect();
        const productsCollection = client.db('car-parts-manufacturers').collection('products');
        const ordersCollection = client.db('car-parts-manufacturers').collection('orders');
        const userCollection = client.db('car-parts-manufacturers').collection('user');
        const reviewsCollection = client.db('car-parts-manufacturers').collection('reviews');
        const paymentCollection = client.db('car-parts-manufacturers').collection('payment');
        const profileCollection = client.db('car-parts-manufacturers').collection('profile');

        
        //  Insert Profile api //
        app.post('/profile', async (req, res) => {
            const profile = req.body;
            const result = await profileCollection.insertOne(profile);
            return res.send({ success: true, result });
        });

        // Get Product Api data //
        app.get('/profile',  async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = profileCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // Payent Api data //
        app.post('/create-payment-intent',verifyJWT, async(req, res) =>{
            const service = req.body;
            const price = service.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });

        // Insert Products Api data //
        app.post('/products', async (req, res) => {
            const products = req.body;
            const result = await productsCollection.insertOne(products);
            return res.send({ success: true, result });
        })

        // Get Product Api data //
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        // Delete Api data //
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        //  Insert Reviews api //
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            return res.send({ success: true, result });
        });

        // Get Users Api data //
        app.get('/reviews',  async (req, res) => {
            const review = await reviewsCollection.find().toArray();
            res.send(review);
        });

        // Get Users Api data //
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // Get Admin Api data //
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        });

        // User admin Api data //
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedData = {
                $set: {role: 'admin'},
            };
            const result = await userCollection.updateOne(filter, updatedData);
            res.send({ result });
        });

        // User singup insert Api data //
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedData = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedData, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        });

        // Products id Find Api //
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        // Insert order api data//
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            return res.send({ success: true, result });
        });
        
        // delete order api  data//
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        // GEt all order api  data//
        app.get('/orders', verifyJWT, async (req, res) => {
            const order = await ordersCollection.find().toArray();
            res.send(order);
        });

        // GEt order api  data//
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });

        app.patch('/orders/:id', verifyJWT, async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
      
            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
          })

    }
    finally {
        console.log('MongoDB is Connected');
    }
}
run().catch(console.dir);



// Express Connection //

app.get('/', (req, res) => {
    res.send('car-parts-manufacturers')
})

app.listen(port, () => {
    console.log(`car-parts-manufacturers app listening on port ${port}`)
})