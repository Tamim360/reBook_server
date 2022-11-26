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


// verfy jwt
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization
    // console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }
    const token = authHeader.split(' ')[1]
    // console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send('Forbidden access')
        }
        req.decoded = decoded
        // console.log(decoded);
        next()
    })
}


// db function
async function run() {
    try {
        // collections
        const usersCollection = client.db('reBook').collection('users');
        const booksCollection = client.db('reBook').collection('books');
        
        // verify admin
        const verifyAdmin = async(req, res, next) => {
            // check the user trying is admin or not
            const decodedEmail = req.decoded.email
            const user = await usersCollection.findOne({ email: decodedEmail })
           
            if (user?.role !== 'admin') {
                // not admin ? prevent to make admin others
                return res.status(401).send('Unauthorized')
            }
            next()
        }

        // verify seller
        const verifySeller = async(req, res, next) => {
            // check the user trying is admin or not
            const decodedEmail = req.decoded.email
            const user = await usersCollection.findOne({ email: decodedEmail })
           
            if (user?.role !== 'seller') {
                // not admin ? prevent to make admin others
                return res.status(401).send('Unauthorized')
            }
            req.userRole = user.role
            next()
        }


        // create jwt for signed in user
        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email}
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''})
        })


        // books api
        app.post('/books', verifyJWT, verifySeller, async (req, res) => {
            const book = req.body
            const result = await booksCollection.insertOne(book)
            res.send(result)
        })

        app.get('/books', async (req, res) => {
            const query = {}
            const books = await booksCollection.find(query).toArray()
            res.send(books)
        })

        // users api
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })


        // check user's role is admin/seller or not
        app.get('/users/adminOrSeller/:email', async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email: email })
            res.send({isAdminOrSeller: user?.role})
        })

    }
    finally {
        
    }
}
run().catch(err => {console.log(err)})






app.listen(port, () => {
    console.log(`reBook server is running on ${port}`);
})