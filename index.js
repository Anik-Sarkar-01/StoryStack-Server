const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bkijc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const database = client.db("StoryStackDB");
        const blogs = database.collection("blogs");
        const comments = database.collection("comments");

        // add a blog to db
        app.post('/add-blog', async(req, res) => {
            const newBlog = req.body;
            const result = await blogs.insertOne(newBlog);
            res.send(result);
        })

        // get all blogs from db
        app.get('/all-blogs', async (req, res) => {
            const result = await blogs.find().toArray();
            res.send(result);
        })

        // get a specific blog details by id
        app.get('/all-blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id)};
            const result = await blogs.findOne(query);
            res.send(result);
        })

        // add a comment to db
        app.post('/add-comment', async(req, res) => {
            const newComment = req.body;
            const result = await comments.insertOne(newComment);
            res.send(result);
        })

        // get all comments from db
        app.get("/all-comments", async(req, res) => {
            const result = await comments.find().toArray();
            res.send(result);
        })

        // get comments by blog id
        app.get("/all-comments/:blog_id", async(req, res) => {
            const blog_id = req.params.blog_id;
            const query = {blog_id : blog_id};
            const result = await comments.find(query).toArray();
            res.send(result);
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
    res.send("Welcome to Story Stack!")
})

app.listen(port, () => {
    console.log(`Story Stack is listening on port ${port}..`);
})
