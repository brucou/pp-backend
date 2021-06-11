const path = require('path');

// Constants
const DOCX_SPELL_ERROR_TAG = "w:proofErr";
const staticDir = path.join(__dirname, 'public');
const viewDir = path.join(__dirname, 'views');
const uploadsDir = path.join(__dirname, 'uploads');
const wipDir = path.join(__dirname, 'wip');
const xmlParsingOptions = {addParent: true, compact: false, spaces: 2};

module.exports = {
  DOCX_SPELL_ERROR_TAG, staticDir, viewDir, uploadsDir, wipDir, xmlParsingOptions
};
