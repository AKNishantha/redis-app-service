const express = require("express");
const axios = require("axios");
const redis = require("redis");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const multer = require("multer");
const inMemorySotorage = multer.memoryStorage();
const uploadStrategy = multer({storage: inMemorySotorage}).single('image');

const app = express();
app.use(cors());
//setup redis client
const client = redis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
});

// redis store configs
const usersRedisKey = "store:azurestudent"; //cahce key for users
//const dataExpireTime = 3600; // 1 hour cache expire time

// start express server
const PORT = process.env.PORT || 5001;

// // users endpoint with caching
app.get("/azurestudent/get", (req, res) => {
    // try to fetch the result from redis
    return client.get(usersRedisKey, (err, azurestudent) => {
        if (azurestudent) {
            return res.json({source: "cache", data: JSON.parse(azurestudent)});

            // if cache not available call API
        } else {
            // get data from remote API
            axios
                .get("https://service-three-app.azurewebsites.net/azurestudent/get")
                .then((azurestudent) => {
                    // save the API response in redis store
                    client.setex(usersRedisKey, 3600, JSON.stringify(azurestudent.data));

                    // send JSON response to client
                    return res.json({source: "api", data: azurestudent.data});
                })
                .catch((error) => {
                    // send error to the client
                    return res.json(error.toString());
                });
        }
    });
});


// user details endpoint
app.get("/", (req, res) =>
    res.send("Welcome to Node.js + Redis With Azure API.")
);

app.post("/file/upload", uploadStrategy, (req, res) => {
    try {

        axios       //should fix link
            .post("https://azurenodefuncapp.azurewebsites.net/api/HttpTrigger1", {
                filedata: req.file.buffer,
                filename: req.file.originalname,
            })
            .then((info) => {
                if (info.status === 200) {
                    return res.status(200).json({

                        message: 'Image Uploaded Successfully!',
                        statusCode: 200
                    });
                } else {
                    return res.status(200).json({
                        data: null,
                        message: 'Image Upload failed!',
                        statusCode: 400
                    });
                }
            }).catch(e => {
            console.log(e);
        });

    } catch (err) {
    }
});

app.listen(PORT, () => {
    console.log("Server listening on port:", PORT);
});
