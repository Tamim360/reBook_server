const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET)
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// midleware
app.use(cors());
app.use(express.json());

// main route
app.get("/", (req, res) => {
  res.send(`reBook server is running on ${port}`);
});

// mongodb uri and client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qbqevch.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verfy jwt
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send("Unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send("Forbidden access");
    }
    req.decoded = decoded;
    // console.log(decoded);
    next();
  });
};

// db function
async function run() {
  try {
    // collections
    const usersCollection = client.db("reBook").collection("users");
    const booksCollection = client.db("reBook").collection("books");
    const categoriesCollection = client.db("reBook").collection("categories");
    const bookingsCollection = client.db("reBook").collection("bookings");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      // check the user trying is admin or not
      const decodedEmail = req.decoded.email;
      const user = await usersCollection.findOne({ email: decodedEmail });

      if (user?.role !== "admin") {
        // not admin ? prevent to make admin others
        return res.status(401).send("Unauthorized");
      }
      next();
    };

    // verify seller
    const verifySeller = async (req, res, next) => {
      // check the user trying is seller or not
      const decodedEmail = req.decoded.email;
      const user = await usersCollection.findOne({ email: decodedEmail });
      // console.log(user.role);
      if (user?.role !== "seller") {
        // not seller ? prevent to get books
        return res.status(401).send("Unauthorized");
      }
      req.userRole = user.role;
      next();
    };

    // create jwt for signed in user
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    // books api
    // post a book
    app.post("/books", verifyJWT, verifySeller, async (req, res) => {
      const book = req.body;
      const result = await booksCollection.insertOne(book);
      res.send(result);
    });

    // get advertised books
    app.get("/books/advertised", async (req, res) => {
      const query = { isAdvertised: "true" };
      // console.log(query);
      const books = await booksCollection.find(query).toArray();
      // console.log(books);
      res.send(books);
    });

    // find all books for specific seller
    app.get("/books", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const books = await booksCollection.find(query).toArray();
      res.send(books);
    });

    // find book under a single category
    app.get("/books/:categoryName", async (req, res) => {
      const name = req.params.categoryName;
      const query = { category: name };
      const books = await booksCollection.find(query).toArray();
      res.send(books);
    });

    // find a single book
    app.get("/books/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const book = await booksCollection.findOne(query);
      res.send(book);
    });

    // delete a single book
    app.delete("/books/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await booksCollection.deleteOne(query);
      res.send(result);
    });

    // update a sold book
    app.put("/books/sold/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const soldOrUnsold = req.query.soldOrUnsold;
      // console.log(soldOrUnsold);
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { sold: soldOrUnsold },
      };
      // console.log(updateDoc);
      const options = { upsert: true };
      const result = await booksCollection.updateOne(query, updateDoc, options);
      // console.log(result);

      res.send(result);
    });

    // update advertise book
    app.put("/books/:bookId", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.bookId;
      console.log(id);
      const advertise = req.query.advertise;
      console.log(advertise);
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { isAdvertised: advertise },
      };
      const options = { upsert: true };
      const result = await booksCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // users api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // check user's role is admin/seller or not
    app.get("/users/adminOrSeller/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      res.send({ isAdminOrSeller: user?.role });
    });

    // delete a user
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // get a user
    // app.get('/users/:email', async (req, res) => {
    //     const email = req.params.email
    //     const user = await usersCollection.findOne({ email: email })
    //     res.send(user)
    // })

    // get verified seller
    app.get("/users/verified", async (req, res) => {
      const query = { isVerified: "true" };
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // get all sellers
    app.get("/users/", verifyJWT, verifyAdmin, async (req, res) => {
      const role = req.query.role;
      const query = { role: role };
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });

    // verify seller
    app.put("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { isVerified: "true" },
      };
      const options = { upsert: true };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // bookings api
    app.post("/bookings", verifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orders = await bookingsCollection.find(query).toArray();
      res.send(orders);
    });
  } finally {
  }
}
run().catch((err) => {
  console.log(err);
});

app.listen(port, () => {
  console.log(`reBook server is running on ${port}`);
});
