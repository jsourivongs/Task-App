var express = require("express");
var app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
const sqlite3 = require('sqlite3').verbose();

var orderby = 'dueDate';
var tasks = [];

//opening db connection for read write
let db = new sqlite3.Database('./exampleDB.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

//Home page route
app.get("/", function (req, res) {

    // db.all(`SELECT * FROM tasks ORDER BY dueDate`, (err, data) => {
    db.all(createQuery('SELECT', '*', 'tasks', orderby, 0), (err, data) => {
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

app.get("/show", function (req, res) {
    res.render('test.ejs');
});

app.get("/test", function (req, res) {
    tasks = [];
    getPageData();
    app.locals.tasks = tasks;
    console.log('this is tasks',tasks);
    res.redirect('show');
});

app.post("/addTask", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var insert = "INSERT INTO tasks VALUES('" + req.body.status + "', '" + req.body.dueDate + "', '" + req.body.description + "', '" + req.body.classID + "', '" + req.body.subtaskID + "' )";
        console.log(insert);
        db.run(insert);
    });
    res.redirect("/test");
});

app.post("/addSubTask/:subtaskID", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var subtaskID = req.params.subtaskID;
        var insert = "INSERT INTO subTasks VALUES('" + subtaskID + "', '0', '" + req.body.description + "' )";
        console.log(insert);
        db.run(insert);

    });
    res.redirect("/test");
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

function getPageData() {
    db.serialize(() => {
        // Queries scheduled here will be serialized.
        db.all(createQuery('SELECT', '*', 'tasks', orderby, 0), (err, data) => {
            if (err) {
                throw err;
            }
            // app.locals.data = data;
            data.forEach(function (item, index, arr) {
                var index = tasks.push(new task(item.status, item.dueDate, item.description, item.classID, item.subtaskID)) - 1;
                q = createQuery('SELECT', 'className', 'class', 0,("classID='" + item.classID + "'"));
                db.all(q, (err, mData) => {
                    if (err) {
                        throw err;
                    }
                    tasks[index].className = mData[0].className;
                });

                q = createQuery('SELECT', '*', 'subTasks', 0, ("subtaskID='" + item.subtaskID + "'"));
                db.all(q, (err, mData) => {
                    if (err) {
                        throw err;
                    }
                    mData.forEach(function (mItem, mIndex, mArr) {
                        tasks[index].subTasks.push(new subTask(mItem.status, mItem.description));
                        console.log(index,mIndex);
                        if (index == 2 && mIndex == 1) {
                            console.log(tasks);
                            app.locals.data = data;
                        }
                    });
                });
            });
        });
    });
}

//should return string of formatted sql query
function createQuery(command, field, table, orderby, where) {
    var q = command + ' ' + field + ' FROM ' + table;
    if (orderby) {
        q += ' ORDER BY ' + orderby;
    }
    if (where) {
        q += ' WHERE ' + where;
    }
    return q;
}

//object to hold each task information
function task(status, dueDate, description, className, subtaskID) {
    this.status = status;
    this.description = description;
    this.dueDate = dueDate;
    this.className = className;
    //array of subTask objects
    this.subTasks = [];
    this.subtaskID = subtaskID
}

//subtask object, will be held in main task in an array
function subTask(status, description) {
    this.status = status;
    this.description = description;
}