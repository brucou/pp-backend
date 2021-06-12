// ADR
// - uuid used to have a unique file name to avoid possible concurrency issues
//   - file with same name but different content processed concurrently
// - set file size limits to avoid memory issues
// - provide minimally useful and understandable error messages back to client
// - we do not do much in terms of validating API responses and incoming requests

const path = require('path');
const createError = require('http-errors');
const fse = require('fs-extra');
const uuid = require('uuid');
const logger = require('morgan');
const zl = require("zip-lib");
const express = require('express');
const fileUpload = require('express-fileupload');
const asyncHandler = require('express-async-handler')

const {staticDir, viewDir, uploadsDir, wipDir} = require("./constants");
const {
  retrieveSpellingErrors,
  applyTextSuggestions,
  extractZipFile,
  readExtractedFile,
  saveUploadedFile,
  requestSpellChecks,
} = require("./helpers");
const uuidv4 = uuid.v4;

// Express app
const app = express();

// View engine setup
app.set('views', viewDir);
app.set('view engine', 'pug');

//Add the client URL to the CORS policy
const cors = require("cors");
const whitelist = ["http://localhost:3000"];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Configure the file upload parameters
app.use(fileUpload({
  // avoids possible memory issues when uploading large files.
  limits: {fileSize: 10 * 1024 * 1024},
  preserveExtension: true,
  abortOnLimit: true,
  // That should be 1mn, do not to let the requesting browser (user) hanging forever!
  uploadTimeout: 60000
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(staticDir));

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

app.post('/upload', asyncHandler(async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const sampleFile = req.files.file;
  if (!sampleFile || !sampleFile.name) {
    return res.status(400).send('Could not get the name of the uploaded file.');
  }

  const uploadPath = path.join(uploadsDir, sampleFile.name);
  const uid = uuidv4();
  const extractDir = path.join(wipDir, uid);
  let data;

  // Read the uploaded document
  try {
    await saveUploadedFile(sampleFile, uploadPath);
    await extractZipFile(uploadPath, extractDir);
    data = await readExtractedFile(extractDir);
  } catch (err) {
    await fse.remove(extractDir);
    throw createError(500, `Failed to read docx file.`)
  }

  // Fetch and apply spelling suggestions
  let xmlString;
  try {
    const {xmlObj, spellingErrors} = await retrieveSpellingErrors(data);
    const responses = await requestSpellChecks(spellingErrors);
    xmlString = await applyTextSuggestions(xmlObj)(responses);
  } catch (err) {
    await fse.remove(extractDir);
    throw createError(400, `Failed to retrieve or apply spelling suggestions.`)
  }

  // Save updated document in the public directory
  // and return the link
  const filename = [uid, sampleFile.name].join(".");
  const destFile = path.join(staticDir, filename);

  try {
    await fse.outputFile(path.join(extractDir, "word", "document.xml"), xmlString)
      .then(() => zl.archiveFolder(extractDir, destFile))
      .then(() => fse.remove(extractDir))
      .then(() => res.send({url: filename}))
  } catch (err) {
    throw createError(400, `Failed to update docx file with spelling suggestions.`)
  }
}));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  if (err) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
  }
});

module.exports = app;

