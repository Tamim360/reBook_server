const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
// const stripe = require("stripe")(process.env.STRIPE_SECRET)
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000

// midleware
app.use(cors())
app.use(express.json())

// main route
app.get('/', (req, res) => {
    res.send(`reBook server is running on ${port}`)
})


// mongodb uri and client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qbqevch.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// bd function
async function run() {
    try {
        const usersCollection = client.db('reBook').collection('users');
        
        // users api
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })
    }
    finally {
        
    }
}
run().catch(err => {console.log(err)})






app.listen(port, () => {
    console.log(`reBook server is running on ${port}`);
})