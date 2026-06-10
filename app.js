const express = require("express");
const path = require("node:path");
const router = require("./routes/router");
const expressSession = require('express-session');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./generated/prisma/client');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const cron = require('node-cron');
const storagedb = require("./queries/storage");

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const app = express();

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(
  expressSession({
    cookie: {
     maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: 'a gnome in space',
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);

app.use("/", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`listening on port ${PORT}`);
});

// execute job each 10 minutes
// jobs can be delete folder / file from trash, or
// unshare folder / file
cron.schedule('*/10 * * * *', async () => {
  try {
    const jobs = await storagedb.getJobs();
    const date = new Date();
    for (const job of jobs) {
      if (job.date < date) {
        if (job.job_type == "delete" && job.item_type == "folder") {
          await storagedb.deleteFolder(job.item_id);
          await storagedb.removeJob(job.item_id);
          await storagedb.addJobLog(job.job_type, job.item_id, job.item_type, job.date)
        }
        if (job.job_type == "delete" && job.item_type == "file") {
          await storagedb.deleteFile(job.item_id);
          await storagedb.removeJob(job.item_id);
          await storagedb.addJobLog(job.job_type, job.item_id, job.item_type, job.date)
        }
        // if (job.job_type == "unshare" && job.item_type == "folder") {
        
        //   await storagedb.removeJob(job.item_id);
        //   await storagedb.addjobLog(job.job_type, job.item_id, job.item_type, job.date)
        // }
        // if (job.job_type == "unshare" && job.item_type == "file") {
        
        //   await storagedb.removeJob(job.item_id);
        //   await storagedb.addjobLog(job.job_type, job.item_id, job.item_type, job.date)
        // }
      }
    }
  } catch (err) {
    console.log(err)
  }
});