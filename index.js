const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://story-stack-d45ff.web.app',
        'https://story-stack-d45ff.firebaseapp.com',
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser())

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ message: 'Unauthorized Access' })
        }
        req.user = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bkijc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const database = client.db("StoryStackDB");
        const blogs = database.collection("blogs");
        const comments = database.collection("comments");
        const wishlist = database.collection("wishlist");
        const bloggerCorner = database.collection("bloggerCorner");
        await blogs.createIndex({ title: "text" })
        await wishlist.createIndex({ id: 1, userEmail: 1 }, { unique: true });


        // auth related apis
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? "none" : "strict",
            })
                .send({ success: true });
        })

        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? "none" : "strict",
            })
                .send({ success: true })
        })

        // add a blog to db
        app.post('/add-blog', verifyToken, async (req, res) => {
            const newBlog = req.body;
            const result = await blogs.insertOne(newBlog);
            res.send(result);
        })

        // get all blogs from db
        app.get('/all-blogs', async (req, res) => {
            const filter = req.query.filter;
            const search = req.query.search;

            let query = {};

            if (filter) {
                query.category = filter;
            }

            if (search) {
                query.$text = { $search: search, $caseSensitive: false };
            }

            const result = await blogs.find(query).toArray();
            res.send(result);
        })

        // get recent blog from db
        app.get("/recent-blogs", async (req, res) => {
            const result = await blogs.find().limit(6).toArray();
            res.send(result);
        });

        // get a specific blog details by id
        app.get('/all-blogs/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogs.findOne(query);
            res.send(result);
        })

        // add a comment to db
        app.post('/add-comment', async (req, res) => {
            const newComment = req.body;
            const result = await comments.insertOne(newComment);
            res.send(result);
        })

        // get comments by blog id
        app.get("/all-comments/:blog_id", async (req, res) => {
            const blog_id = req.params.blog_id;
            const query = { blog_id: blog_id };
            const result = await comments.find(query).toArray();
            res.send(result);
        })

        // update a specific blog
        app.put("/all-blogs/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const blogData = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateBlog = {
                $set: blogData,
            };
            const result = await blogs.updateOne(filter, updateBlog, options);
            res.send(result);
        })

        // add a blog to wishlist
        app.post('/add-wishlist', async (req, res) => {
            const wishBlog = req.body;
            const existing = await wishlist.findOne({
                id: wishBlog.id,
                userEmail: wishBlog.userEmail
            });
            if (existing) {
                return res.status(409).send({ message: "Already Exists" })
            }
            const result = await wishlist.insertOne(wishBlog);
            res.send(result);
        })

        // get all blogs in the wishlist by user email
        app.get('/all-wishlist', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };

            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const result = await wishlist.find(query).toArray();
            res.send(result);
        })

        // delete blog from wishlist by id
        app.delete('/delete-wishBlog/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await wishlist.deleteOne(query);
            res.send(result)
        })

        // get featured blogs (top 10) 
        app.get('/featured-blogs', async (req, res) => {
            const allBlogs = await blogs.find().toArray();
            const sortedBlogs = allBlogs.map(blog => ({
                ...blog, wordCount: blog.longDescription ? blog.longDescription
                    .split(' ').length : 0
            }))
                .sort((a, b) => b.wordCount - a.wordCount)
                .slice(0, 10);
            res.send(sortedBlogs);
        });

        // get all content from bloggerCorner
        app.get('/blogger-corner', async (req, res) => {
            const result = await bloggerCorner.find().toArray();
            res.send(result);
        })

        // get content form blogger corner by id
        app.get('/blogger-corner/:id', async (req, res) => {
            const contentId = req.params.id;
            const query = { _id: new ObjectId(contentId) };
            const result = await bloggerCorner.findOne(query);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

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
    console.log(`Story Stack is listening on port ${port}`);
})
