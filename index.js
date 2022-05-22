const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
require ('dotenv').config();
const app = express()
const port = process.env.Port || 5000;


app.use(cors());
app.use(express.json())

// Mongodb Connection //

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASS}@cluster0.eosns.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run (){

    try{
        await client.connect();
        const serviceCollection = client.db('car-parts-manufacturers').collection('products');

        app.get('/products', async(req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

    }
    finally{
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