const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const ws = require("ws");
const fs = require("fs");

const User = require("./models/User");
const Message = require("./models/Message");
const { Console } = require("console");

mongoose.connect(process.env.MONGO_CONNECTION_STRING);
jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "https://chatterbox-web.onrender.com",
    // origin: "http://localhost:5173",
  })
);
app.use(cookieParser());

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("No token");
    }
  });
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.get("/messages/:userId", async (req, res) => {
  //when you click on an online user,
  //we want to fetch messages between us and them
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 }); //sort asc
  res.json(messages);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("No token");
  }
});

app.get("/people", async (req, res) => {
  //when you click on an online user,
  //we want to fetch messages between us and them
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)
            .json({
              id: foundUser._id,
            });
        }
      );
    }
  }
});

app.post("/logout", async (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("okay");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    throw err;
    res.status(500).json(err);
  }
});

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT);
const wss = new ws.WebSocketServer({ server });

console.log("Logging after websocket creation attempt");

wss.on("error", console.error);

wss.on("connection", (connection, req) => {
  console.log("On connection callback");

  connection.on("error", console.error);

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  /**
   * when someone connects, we say the person is alive
   * the we set an interval to ping the person
   * every number of seconds
   */
  connection.isAlive = true;

  connection.timer = setInterval(() => {
    //ping connection every 5 s
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  //callback for pong
  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  //read user name and id from the cookie from this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    //could be several cookies separated by a semi color
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith(" token="));

    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];

      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          Console.log("JWT token log: ");
          console.log({ userId, username });
          Console.log("***");
          connection.userId = userId;
          connection.username = username;
          console.log({
            cnUserId: connection.userId,
            cnUsername: connection.username,
          });
          console.log(
            "*** Log after connection user id and username is supposed to be set"
          );
        });
      }
    }
  }

  //
  connection.on("message", async (message) => {
    console.log("On message callback");
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let filename = null;
    if (file) {
      const parts = file.name.split(".");
      const ext = parts[parts.length - 1];
      filename = Date.now() + "." + ext;
      const path = __dirname + "/uploads/" + filename;
      const bufferData = Buffer.from(file.data.split(",")[1], "base64");
      fs.writeFile(path, bufferData, () => {
        console.log("file saved: " + path);
      });
    }

    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: filename,
      });
      console.log("Message created for sender: " + connection.userId);
      console.log(messageDoc);
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: filename,
              _id: messageDoc._id,
            })
          )
        );
    }
  });

  //notify everyone about online people
  //wss clients is a set so we destructure into a normal array
  //   console.log([...wss.clients].map((c) => c.username));

  //
  notifyAboutOnlinePeople();
});
