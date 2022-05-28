const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();



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
        app.get('/reviews',verifyJWT, async (req, res) => {
            const review = await reviewsCollection.find().toArray();
            res.send(review);
        })

        // Get Users Api data //
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // Get Admin Api data //
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin'
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
            console.log(query);
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        // Insert order api data//
        app.post('/orders', async (req, res) => {
            const orders = req.body;
            const result = await ordersCollection.insertOne(orders);
            return res.send({ success: true, result });
        });

        // GEt order api  data//
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

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