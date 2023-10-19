const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();

const router = jsonServer.router("./db.json");

const db = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));

const middlewares = jsonServer.defaults();
const PORT = process.env.PORT || 3000;

server.use(middlewares);

server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

const SECRET_KEY = "123456789";
const expiresIn = "1h";

function createToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
    return jwt.verify(token, SECRET_KEY, (err, decode) =>
        decode !== undefined ? decode : err
    );
}

function isAuthenticated({ email, password }) {
    return (
        db.users.findIndex(
            (user) => user.email === email && user.password === password
        ) !== -1
    );
}

server.post("/register", (req, res) => {
    const { username, email, password } = req.body;

    exist_user = db.users.findIndex((x) => x.email === email);
    if (exist_user !== -1) {
        return res.status(401).json({
            status: 401,
            message: "Email already in use!",
        });
    }

    const new_user = {
        id: db.users.length + 1,
        username,
        email,
        password,
    };

    db.users.push(new_user);
    fs.writeFileSync("./db.json", JSON.stringify(db), () => {
        if (err) return console.log(err);
        console.log("writing to " + fileName);
    });
    res.status(201).json({
        status: 201,
        message: "Success",
        data: new_user,
    });
});

//login
server.post("/login", (req, res) => {
    // const {email, password} = req.body
    const email = req.body.email;
    const password = req.body.password;

    if (isAuthenticated({ email, password }) === false) {
        const status = 401;
        const message = "Incorrect email or password";
        res.status(status).json({ status, message });
        return;
    }
    const access_token = createToken({ email, password });
    res.status(200).json({
        status: 200,
        message: "Success",
        data: {
            access_token,
        },
    });
});

server.use("/auth", (req, res, next) => {
    if (
        req.headers.authorization == undefined ||
        req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
        const status = 401;
        const message = "Bad authorization header";
        res.status(status).json({ status, message });
        return;
    }
    try {
        let verifyTokenResult;
        verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

        if (verifyTokenResult instanceof Error) {
            const status = 401;
            const message = "Error: access_token is not valid";
            res.status(status).json({ status, message });
            return;
        }
        next();
    } catch (err) {
        const status = 401;
        const message = "Token is our of date.";
        res.status(status).json({ status, message });
    }
});

//view all users
server.get("/auth/users", (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            users: db.users,
        },
    });
});

//view user by email
server.get("/auth/users/:email", (req, res) => {
    const email = req.params.email;

    const exist_email = db.users.findIndex((user) => user.email == email);
    const result = db.users.filter((user) => user.email == email);
    if (exist_email !== -1) {
        const status = 200;
        return res.status(status).json({ status, result });
    } else {
        return res.status(401).json({
            status: 401,
            message: "Email is not found!!",
        });
    }
});

//DO SOMETHING
//END

// get list of books
server.get("/auth/books", (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            books: db.books,
        },
    });
});

// get single book by id
server.get("/auth/books/:id", (req, res) => {
    const id = req.params.id;

    const exist_book = db.books.findIndex((book) => book.id == id);
    const result = db.books.filter((book) => book.id == id);
    if (exist_book !== -1) {
        const status = 200;
        return res.status(status).json({ status, result });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Book is not found!!",
        });
    }
});

// create order
server.post("/auth/orders/create", (req, res) => {
    const orderData = req.body;
    let book = db.books.find(book => book.id == orderData.bookId && book.available);

    if (book) {
        book.available = false;

        const new_order = {
            id: db.orders.length + 1,
            ...orderData,
            timestamp: new Date().getTime()
        };

        db.orders.push(new_order);

        fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
            if (err) return console.log(err);
            console.log("writing to db.json");
        });

        return res.status(201).json({
            status: 201,
            message: "Success",
            data: new_order,
        });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Book not exist or not available!!",
        });
    }
});

// get an order
server.get("/auth/orders/:id", (req, res) => {
    const id = req.params.id;

    const exist_order = db.orders.findIndex((order) => order.id == id);
    const result = db.orders.filter((order) => order.id == id);
    if (exist_order !== -1) {
        const status = 200;
        return res.status(status).json({ status, result });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Order is not found!!",
        });
    }
});

// update order
server.patch("/auth/orders/update/:id", (req, res) => {
    const orderId = req.params.id;
    const updatedOrderData = req.body;

    let order = db.orders.find(order => order.id == orderId);

    if (order) {
        Object.assign(order, updatedOrderData);

        fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
            if (err) return console.log(err);
            console.log("writing to db.json");
        });

        return res.status(200).json({
            status: 200,
            message: "Success",
            data: order,
        });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Order not found",
        });
    }
});

// delete order
server.delete("/auth/orders/delete/:id", (req, res) => {
    const orderId = req.params.id;

    let orderIndex = db.orders.findIndex(order => order.id == orderId);

    if (orderIndex !== -1) {
        db.orders.splice(orderIndex, 1);

        fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
            if (err) return console.log(err);
            console.log("writing to db.json");
        });

        return res.status(200).json({
            status: 200,
            message: "Success",
            data: `Order with id ${orderId} has been deleted.`,
        });
    } else {
        return res.status(404).json({
            status: 404,
            message: "Order not found",
        });
    }
});

// get all order
server.get("/auth/orders", (req, res) => {
    res.status(200).json({
        status: 200,
        data: {
            orders: db.orders,
        },
    });
});

// delete user by email
server.delete("/auth/users/delete/:email", (req, res) => {
    const userEmail = req.params.email;

    let userIndex = db.users.findIndex(user => user.email == userEmail);

    if (userIndex !== -1) {
        db.users.splice(userIndex, 1);

        fs.writeFileSync("./db.json", JSON.stringify(db), (err) => {
            if (err) return console.log(err);
            console.log("writing to db.json");
        });

        return res.status(200).json({
            status: 200,
            message: "Success",
            data: `User with email ${userEmail} has been deleted.`,
        });
    } else {
        return res.status(404).json({
            status: 404,
            message: "User not found",
        });
    }
});

server.use(router);

server.listen(PORT, () => {
    console.log("Run Auth API Server");
});