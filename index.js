const express = require('express')
const app = express('')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cors = require('cors')
const port = process.env.PORT || 4000;

// middleware
app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'authorization not found' })
  }
  const token = authorization.split(' ')[1]
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnbwwnw.mongodb.net/?retryWrites=true&w=majority`;

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cnbwwnw.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // warning:
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next();
    }

    const usersCollection = client.db("bistroBossDB").collection("users");
    const menuCollection = client.db("bistroBossDB").collection("menu");
    const reviewCollection = client.db("bistroBossDB").collection("reviews");
    const cartCollection = client.db("bistroBossDB").collection("carts");

    // user rated apis
    app.post('/jwt', (req, res) => {
      const id = req.body;
      const token = jwt.sign(id, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      res.send({ token })
    })

    app.get('/users', verifyJWT,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user alredy exting' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    // security layser:JWT
    // same email
    // admin cheak
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      
      res.send(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // menu apis
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result)
    })

    app.post('/menu',verifyJWT,verifyAdmin,async(req,res)=>{
      const navItem = req.body;
      const result = await menuCollection.insertOne(navItem);
      res.send(result)
    })
    // reviews apis
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })
    // cart side apis
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbiden access' })
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray()
      console.log(result)
      res.send(result)
    })
    app.post('/carts', async (req, res) => {
      const id = req.body;
      console.log(id);
      const result = await cartCollection.insertOne(id);
      res.send(result)
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('server is runiing')
})

app.listen(port, () => {
  console.log(`server is right now,${port}`)
})