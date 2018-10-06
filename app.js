var express = require("express");
var app = express();
app.use(express.static(__dirname + '/public'));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
const sqlite3 = require('sqlite3').verbose();

var orderby = true;
var tasks = [];
var taskCount;
var subTaskCount;
var classes = [];

//opening db connection for read write
let db = new sqlite3.Database('./taskDB.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

//Home page route
app.get("/", function (req, res) {
    tasks = [];
    getPageData();
    app.locals.tasks = tasks;
    res.redirect('show');
});

app.get("/credits", function (req, res) {
    res.send('thats right');
});

app.get("/show", function (req, res) {
    taskCount = 0;
    tasks.forEach(item => {
        if (item.subtaskID >= taskCount) {
            taskCount = item.subtaskID + 1;
        }
    });

    subTaskCount = 0;
    tasks.forEach(item => {
        item.subTasks.forEach(mItem => {
            if (mItem.identifier >= subTaskCount) {
                subTaskCount = mItem.identifier + 1;
            }
        });
    });
    res.render('home.ejs');
});

app.post("/addTask", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("INSERT INTO tasks VALUES ('0', ?, ?, ?, ?)");
        stmt.run(req.body.dueDate, req.body.description, req.body.classID, taskCount);
        stmt.finalize();
    });
    res.redirect("/");
});

app.post("/addSubTask/:subtaskID", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("INSERT INTO subTasks VALUES (?, '0', ?, ?)");
        stmt.run(req.params.subtaskID, req.body.description, subTaskCount);
        stmt.finalize();
    });
    res.redirect("/");
});

app.post("/deleteSubTask/:identifier", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("DELETE FROM subTasks WHERE identifier=?");
        stmt.run(req.params.identifier);
        stmt.finalize();
    });
    res.redirect("/");
});

//need to delete both tasks and subtasks here
app.post("/deleteTask/:subtaskID", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("DELETE FROM tasks WHERE subtaskID=?");
        stmt.run(req.params.subtaskID);
        stmt.finalize();
    });
    db.serialize(() => {
        var stmt = db.prepare("DELETE FROM subTasks WHERE subtaskID=?");
        stmt.run(req.params.subtaskID);
        stmt.finalize();
    });
    res.redirect("/");
});

app.get("/changeStatus/:subtaskID", function (req, res) {
    var stmt = db.prepare("SELECT status FROM tasks WHERE subtaskID=?");
    stmt.get(req.params.subtaskID, (err, data) => {
        if(err) {
            throw err;
        }
        var update = db.prepare("UPDATE tasks SET status=? WHERE subtaskID=?");
        update.run((data.status+1)%3, req.params.subtaskID);
        update.finalize();
    });
    res.redirect('/');
});

app.get("/changeSubtaskStatus/:identifier", function (req, res) {
    var stmt = db.prepare("SELECT status FROM subTasks WHERE identifier=?");
    stmt.get(req.params.identifier, (err, data) => {
        if(err) {
            throw err;
        }
        var update = db.prepare("UPDATE subTasks SET status=? WHERE identifier=?");
        update.run((data.status+1)%2, req.params.identifier);
        update.finalize();
    });
    res.redirect('/');
});

app.get("/orderbyDate", function (req, res) {
    orderby = false;
    res.redirect('/');
});

app.get("/orderbyClass", function (req, res) {
    orderby = true;
    res.redirect('/');
});

app.get("/classes", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("SELECT * FROM class ORDER BY classID");
        stmt.all([], (err, data) => {
            if (err) {
                throw err;
            }
            classes = data;
        });
        res.redirect('./showClasses');
    });
});

app.get("/showClasses", function (req, res) {
    res.render('classes.ejs', {
        classes: classes
    });
});

app.post("/deleteClass/:classID", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("SELECT subtaskID FROM tasks WHERE classID=?");
        stmt.all([req.params.classID], (err, rows) => {
            if (err) {
                throw err;
            }
            rows.forEach(function (subtaskID) {
                var del = db.prepare("DELETE FROM tasks WHERE subtaskID=?");
                del.run(subtaskID.subtaskID);
                del = db.prepare("DELETE FROM subTasks WHERE subtaskID=?");
                del.run(subtaskID.subtaskID);
            });
        });
        stmt = db.prepare("DELETE FROM class WHERE classID=?");
        stmt.run(req.params.classID);
        stmt.finalize();
        res.redirect("/classes");
    });
});

app.post("/addClass", function (req, res) {
    db.serialize(() => {
        var stmt = db.prepare("INSERT INTO class VALUES (?, ?)");
        stmt.run(req.body.classID, req.body.className);
        stmt.finalize();
        res.redirect("/classes");
    });
});

app.get("*", function (req, res) {
    res.send('cannot find page');
});

app.listen(8080, process.env.IP, function () {
    console.log('Server has started');
});

function getPageData() {
    db.serialize(() => {
        if (orderby) {
            var stmt = db.prepare("SELECT * FROM tasks ORDER BY classID, dueDate");
        } else {
            var stmt = db.prepare("SELECT * FROM tasks ORDER BY dueDate, classID");
        }
        stmt.all([], (err, data) => {
            if (err) {
                throw err;
            }
            // app.locals.data = data;
            data.forEach(function (item, index, arr) {
                var index = tasks.push(new task(item.status, item.dueDate, item.description, item.classID, item.subtaskID)) - 1;
                var getClass = db.prepare("SELECT className FROM class WHERE classID=?");

                getClass.get(item.classID, (err, mData) => {
                    if (err) {
                        throw err;
                    }
                    tasks[index].className = mData.className;
                });

                var getSubTasks = db.prepare("SELECT * FROM subTasks WHERE subtaskID=?");
                getSubTasks.all(item.subtaskID, (err, mData) => {
                    if (err) {
                        throw err;
                    }
                    mData.forEach(function (mItem, mIndex, mArr) {
                        tasks[index].subTasks.push(new subTask(mItem.status, mItem.description, mItem.identifier));
                        console.log(index, mIndex);
                        if (index == 2 && mIndex == 1) {
                            app.locals.data = data;
                        }
                    });
                });
            });
        });
    });
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