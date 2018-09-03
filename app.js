var express = require("express");
var app = express();
app.use(express.static(__dirname + '/public'));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
const sqlite3 = require('sqlite3').verbose();

var orderby = 'classID, dueDate';
var tasks = [];
var taskCount;
var subTaskCount;
var classes = [];

//opening db connection for read write
let db = new sqlite3.Database('./exampleDB.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

//Home page route
app.get("/", function (req, res) {
    res.redirect('test');
});

app.get("/credits", function (req, res) {
    res.send('thats right bitch');
});

app.get("/show", function (req, res) {
    taskCount = 0;
    tasks.forEach(item => {
        if (item.subtaskID >= taskCount) {
            taskCount = item.subtaskID+1;
        }
    });

    subTaskCount = 0;
    tasks.forEach(item => {
        item.subTasks.forEach(mItem => {
            if (mItem.identifier >= subTaskCount) {
                subTaskCount = mItem.identifier+1;
            }
        });
    });
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
        var insert = "INSERT INTO tasks VALUES('" + 0 + "', '" + req.body.dueDate + "', '" + req.body.description + "', '" + req.body.classID + "', '" + taskCount + "' )";
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
        var insert = "INSERT INTO subTasks VALUES('" + subtaskID + "', '0', '" + req.body.description + "', " + subTaskCount + " )";
        console.log(insert);
        db.run(insert);

    });
    res.redirect("/test");
});

app.post("/deleteSubTask/:identifier", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var identifier = req.params.identifier;
        var q = "DELETE FROM subTasks WHERE identifier='" + identifier + "'";
        console.log(q);
        db.run(q);

    });
    res.redirect("/test");
});

app.post("/deleteTask/:subtaskID", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var subtaskID = req.params.subtaskID;
        var q = "DELETE FROM tasks  WHERE subtaskID='" + subtaskID + "';";
        console.log(q);
        db.run(q);
        q = "DELETE FROM subTasks  WHERE subtaskID='" + subtaskID + "';";
        console.log(q);
        db.run(q);

    });
    res.redirect("/test");
});

app.get("/changeStatus/:subtaskID", function (req, res) {
    console.log('in change Status!');
    var subtaskID = req.params.subtaskID;
    var q = "SELECT status FROM tasks WHERE subtaskID='" + subtaskID + "';";
    db.all(q, (err, data) => {
        if (err) {
            throw err;
        }
        q = "UPDATE tasks SET status = " + ((data[0].status + 1) % 3 ) + " WHERE subtaskID='" + subtaskID + "';";
        console.log(q);
        db.run(q);
    });
    res.redirect('/test');
});

app.get("/changeSubtaskStatus/:identifier", function (req, res) {
    console.log('in change SubTask Status!');
    var identifier = req.params.identifier;
    var q = "SELECT status FROM subTasks WHERE identifier='" + identifier + "';";
    db.all(q, (err, data) => {
        if (err) {
            throw err;
        }
        q = "UPDATE subTasks SET status = " + ((data[0].status + 1) % 2 ) + " WHERE identifier='" + identifier + "';";
        console.log(q);
        db.run(q);
    });
    res.redirect('/test');
});

app.get("/orderbyDate", function (req, res) {
    orderby = 'dueDate';
    res.redirect('test');
});

app.get("/orderbyClass", function (req, res) {
    orderby = 'classID, dueDate';
    res.redirect('test');
});

app.get("/classes", function (req, res) {
    q = "SELECT * FROM class ORDER BY classID"
    db.serialize(() => {
        db.all(q, (err, data) => {
            if (err) {
                throw err;
            }
            console.log(data);
            classes = data;
        });
        res.redirect('./showClasses');
    });
});

app.get("/showClasses", function (req, res) {
    res.render('classes.ejs',{ classes:classes });
});

app.post("/deleteClass/:classID", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var classID = req.params.classID;
        db.all("SELECT subtaskID FROM tasks WHERE classID='" + classID + "';", function(err, rows) {
            if(err) {
                throw err;
            }
            rows.forEach(function (subtaskID) {
                var q = "DELETE FROM tasks  WHERE subtaskID='" + subtaskID.subtaskID + "';";
                console.log(q);
                db.run(q);
                q = "DELETE FROM subTasks  WHERE subtaskID='" + subtaskID.subtaskID + "';";
                console.log(q);
                db.run(q);
                    });
            });
            var q = "DELETE FROM class  WHERE classID='" + classID + "';";
            console.log(q);
            db.run(q);
            res.redirect("/classes");
    });
});

app.post("/addClass", function (req, res) {
    db.serialize(() => {
        // console.log(res);
        // Queries scheduled here will be serialized.
        var insert = "INSERT INTO class VALUES('" + req.body.classID + "', '" + req.body.className + "' );";
        console.log(insert);
        db.run(insert);
        res.redirect("/classes");
    });
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
                        tasks[index].subTasks.push(new subTask(mItem.status, mItem.description, mItem.identifier));
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
function subTask(status, description, identifier) {
    this.status = status;
    this.description = description;
    this.identifier = identifier;
}