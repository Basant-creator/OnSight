const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, '../.env') })
const app = express()

app.use(cors())
app.use(express.json())

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/exam_platform"
mongoose.connect(mongoURI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err))

app.get("/", (req,res)=>{
    res.send("API is running")
})

app.listen(3000, ()=>{
    console.log("Server running on port 3000")
})