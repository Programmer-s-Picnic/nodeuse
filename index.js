const express = require("express");
const app = express();

const port = 3000;

app.get("/", (req, res) => {
    let name = ["Dhoni", "Virat", "Hardik"];
    
    res.render("hello.ejs", {username: name} );
});

app.listen(port, (req,res) => {
    console.log(`Server running at http://localhost${port}`);
});
