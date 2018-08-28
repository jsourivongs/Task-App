var express = require("express");
var app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
const sqlite3 = require('sqlite3').verbose();

//opening db connection for read write
let db = new sqlite3.Database('./taskDB.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

//Home page route
app.get("/", function (req, res) {

    db.all(`SELECT * FROM tasks`, (err, data) => {
        if (err) {
            throw err;
        }
        console.log(data);
        app.locals.data = data;
        res.render('home.ejs');
    });
});

app.get("/about", function (req, res) {
    res.send('hi');
});

app.post("/addTask", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var insert = "INSERT INTO tasks VALUES('" + req.body.status + "', '" + req.body.dueDate + "', '" + req.body.description + "', '" + req.body.classID + "', '" + req.body.subtaskID + "' )";
        console.log(insert);
        db.run(insert);
    });
    res.redirect("/");
});

app.get("*", function (req, res) {
    res.send('cannot find page');
});

app.listen(3000, process.env.IP, function () {
    console.log('SERVER HAS STARTED!');
});

//This should close the db connection
// db.close((err) => {
//     if (err) {
//         console.error(err.message);
//     }
//     console.log('Close the database connection.');
//     });


function readData() {
    db.serialize(() => {
        // Queries scheduled here will be serialized.
        db.each(`SELECT * FROM tasks`, (err, row) => {
            if (err) {
                throw err;
            }
            return row;
        });
    });
}