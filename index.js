const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config()
const stripe = require("stripe")(process.env.SK_KEY)
const app = express();

//Middle-ware
app.use(cors())
app.use(express.json());


//Mongodb linking

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k57jaxp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//JWT Verification
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Stop here' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {

        //Collection declaration start
        const categoryCollection = client.db('Rephone').collection('Categories')
        const productCollection = client.db('Rephone').collection('products')
        const userCollection = client.db('Rephone').collection('users')
        const bookingCollection = client.db('Rephone').collection('bookings')
        const paymentCollection = client.db('Rephone').collection('payments')
        //collection declaration ends


        //user Verify Start
        //Admin Verify
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query);
            console.log(user.role)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }
        //seller Verify
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query);
            console.log(user.role)
            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }
        //buyer Verify
        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await userCollection.findOne(query);
            console.log(user.role)
            if (user?.role !== 'Buyer') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }

        //user Verify End

        //Catagories data loading

        app.get('/catagories', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })

        //Products launching
        app.get('/advertisements', async (req, res) => {
            const filter = {
                advertise: true,
                status: "available"
            }
            const result = await productCollection.find(filter).toArray();
            res.send(result);
        })
        app.put('/advertisements/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        })
        // app.get('/products', async (req, res) => {
        //     const query = {}
        //     const result = await productCollection.find(query).toArray();
        //     res.send(result);
        // })
        app.get('/products/:id', async (req, res) => {
            const catagoryId = req.params.id;
            const filter = {
                categoryId: catagoryId,
                status: "available"
            }
            const result = await productCollection.find(filter).toArray();
            res.send(result);
        })
        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const sellerEmail = email;
            const filter = {
                sellerEmail: sellerEmail
            }
            const result = await productCollection.find(filter).toArray();
            res.send(result);
        })
        app.get('/reportedproducts', verifyJWT, verifyAdmin, async (req, res) => {
            const filter = {
                reported: true,
            }
            const result = await productCollection.find(filter).toArray();
            res.send(result);
        })
        app.put('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    reported: true
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        })
        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        app.delete('/reportedproducts/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })


        //JWT Token sender

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '60d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })

        //users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
        })
        //verify checker
        app.get('/users', async (req, res) => {
            const email = req.query.email;
            const query = {
                email,
                isVerified: true
            }
            const result = await userCollection.findOne(query);
            res.send({ isVerified: result?.isVerified === true })
        })
        //Admin Checker
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })
        app.get('/users/seller', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {
                role: "Seller"
            }
            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        })
        app.get('/users/buyer', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {
                role: "Buyer"
            }
            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        })
        app.put('/users/verifySeller/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })
        //Seller Checker
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' })
        })
        //Buyer Checker
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' })
        })
        app.put('/users/verifySeller/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    isVerified: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        })
        // Booking section
        app.get('/bookings', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = {
                buyerEmail: email
            }
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.findOne(query);
            res.send(result)
        })
        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const query = {
                buyerEmail: booking.buyerEmail,
                productId: booking.productId
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already Booked a meeting for ${booking.ProductName}`;
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const productId = payment.productId
            const filter = { _id: ObjectId(productId) }
            const updatedproduct = {
                $set: {
                    status: "sold",
                    transactionId: payment.transactionID
                }
            }
            const newproduct = await productCollection.updateOne(filter, updatedproduct)
            const _id = payment.bookingId
            const bookfilter = { _id: ObjectId(_id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionID
                }
            }
            const updatedbooking = await bookingCollection.updateOne(bookfilter, updatedDoc)
            res.send(result);
        })


    }
    finally {

    }
}
run().catch(console.log)

app.get('/', async (req, res) => {
    res.send('Rephone server is running')
})

app.listen(port, () => console.log(`Rephone running on : ${port}`))