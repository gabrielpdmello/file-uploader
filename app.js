const express = require("express");
const path = require("node:path");
const router = require("./routes/router");
const assetsPath = path.join(__dirname, "public");

const app = express();
app.use(express.static(assetsPath));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use("/", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`listening on port ${PORT}`);
});
