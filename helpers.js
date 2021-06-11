const util = require('util');
const path = require('path');
const fse = require('fs-extra');
const axios = require('axios').default;
const zl = require("zip-lib");
const xml2JS = require('xml-js');
const {DOCX_SPELL_ERROR_TAG, xmlParsingOptions} = require("./constants");

// Helpers

// Show object with colors and infinite recursion
function inspect(obj) {
  return util.inspect(obj, true, null, true)
}

function isValidDocxFileRootContent(xmlObj) {
  // Cf. xml schema fragment: http://webapp.docx4java.org/OnlineDemo/ecma376/WordML/body.html
  // The following XML Schema fragment defines the contents of this element:
  //   <complexType name="CT_Body">
  //     <sequence>
  //       <group ref="EG_BlockLevelElts" minOccurs="0" maxOccurs="unbounded"/>
  //       <element name="sectPr" minOccurs="0" maxOccurs="1" type="CT_SectPr"/>
  //     </sequence>
  //   </complexType>
  // Edge case when the document is empty, there may not be any paragraph!
  // So don't do also do xmlObj["w:document"]["w:body"]["w:p"];
  const documentElement = xmlObj && xmlObj.elements && xmlObj.elements[0] && xmlObj.elements[0].name === "w:document";
  if (!documentElement) return false;

  const bodyElement = xmlObj.elements[0].elements && xmlObj.elements[0].elements[0].name === "w:body";

  return Boolean(bodyElement);
}

/**
 * Parses an XML file into a JS object and returns that object
 * and the spelling errors it contains.
 * The spelling errors are identified by the relevant docx tags.
 * @param {String} data docx document's XML content to be parsed
 * @returns {{spellingErrors: Array<{textElement, text: String, spellStart: Element, spellEnd: Element}>, xmlObj: Element}}
 */
const retrieveSpellingErrors = data => {
  // Using `{compact: false}` parsing option to respect the xml tag ordering
  // Tag ordering matters because the spelling error tags are ordered
  // `spellStart` first, then `spellEnd` at the end of the spelling block
  const xmlObj = xml2JS.xml2js(data, xmlParsingOptions);

  if (!isValidDocxFileRootContent(xmlObj)) {
    // NTH: more explicit error, or link to trouble shooting section
    throw 'The uploaded file may be corrupted.'
  }

  // The spelling error tag (`w:proofErr`) mark the spelling mistakes
  // Example: (http://webapp.docx4java.org/OnlineDemo/ecma376/WordML/proofErr.html)
  // <w:p>
  //   <w:proofErr w:val="gramStart"/>
  //     <w:r>
  //       <w:t>This are</w:t>
  //     </w:r>
  //   <w:proofErr w:val="gramEnd"/>
  //     <w:r>
  //       <w:t xml:space="preserve"> an error.</w:t>
  //     </w:r>
  // </w:p>
  // However, the w:proofErr tag can be in many places in the document
  // - under body: Cf. http://webapp.docx4java.org/OnlineDemo/ecma376/WordML/body.html
  // - Under del: Cf. http://webapp.docx4java.org/OnlineDemo/ecma376/WordML/del_1.html
  // - cf. parents in http://webapp.docx4java.org/OnlineDemo/ecma376/WordML/proofErr.html
  //   for exhaustive list of possibilities
  // Maybe it is not possible everywhere, but for simplicity we will assume it may
  // occur in any place and search for it by traversing the whole XML tree.
  // ASSUMPTION:
  // - We assume that a `spellstart` is always closed with a `spellend` (i.e. well-formed docx)
  // - no `spellstart` can be nested under another one
  // - In particular, between `spellStart` and `spellEnd` there is only <w:r> and <w:t> tags
  // that is regular text
  // - only one word (i.e. one <w:r><w:t>word</w:t></w:r>) is the object of a spelling mistake
  // TODO: check the assumptions on a variety of docx files and from specs
  let traversalStack = xmlObj.elements[0].elements[0].elements
    // shallow copy as we don't want to modify xmlObj (yet)
    ? [...xmlObj.elements[0].elements[0].elements]
    : [];

  /** @type Array<{textElement, text: String, spellStart: String, spellEnd: String}> */
  let spellingErrors = [];

  // We traverse the xml tree and identify the words with spelling errors
  while (traversalStack.length > 0) {
    const element = traversalStack.shift();
    if (element.elements && element.elements.length > 0) {
      // shallow copy again so we don't touch xmlObj
      traversalStack.push(...element.elements)
    }
      // This is an else if because proofErr elements are self-closing tags
    // hence no children elements
    else if (element.name === DOCX_SPELL_ERROR_TAG) {
      // Per docx semantics, this should be an element with attribute `w:type=spellStart`
      // ASSUMPTION:
      // The next element is a w:r (run)
      // The next next element has attribute `w:type=spellEnd`
      const textElement = traversalStack.shift();
      // ASSUMPTION: the text in `w:proofErr` is already trimmed so no need
      // to remove extra spaces.
      // The spelling API currently seems to trim the text itself, but this may change
      // without notice
      const text = getTextFromDocxTextElement(textElement) || "";
      const spellEnd = traversalStack.shift();

      spellingErrors.push({spellStart: element, textElement, text, spellEnd});
    }
  }

  return {xmlObj, spellingErrors}
}

/**
 *
 * @param {Array<{textElement: Element, text: String, spellStart: Element, spellEnd: Element}>} spellingErrors
 * @returns {Promise<{spellStart: Element, suggestedText: any | string, text: String, textElement: Element, spellEnd: Element}[]>}
 */
function requestSpellChecks(spellingErrors) {
  return Promise.all(spellingErrors.map(
    ({spellStart, textElement, text, spellEnd}) => {
      // Example
      // Request
      // https://api.languagetoolplus.com/v2/check?text=dgs&language=en-US&enabledOnly=false
      // Response
      // {
      // ...
      //   "matches": [
      //   {
      //     "message": "Possible spelling mistake found.",
      //     "shortMessage": "Spelling mistake",
      //     "replacements": [
      //       {
      //         "value": "DGS"
      //       },
      //       {
      //         "value": "AGS"
      //       },
      //     ...
      //     ],
      //   ...
      //   }
      // ]
      // }
      const url = `https://api.languagetoolplus.com/v2/check?text=${text}&language=en-US&enabledOnly=false`;

      return axios({
        // https://languagetool.org/http-api/#!/default/post_check
        // documents a POST request but the browser makes a GET request
        // https://api.languagetoolplus.com/v2/check?text=spling&language=en-US&enabledOnly=false
        // and so do we
        method: 'get',
        url
      })
        .then(response => {
          // API responds to empty texts with an empty array of matches,
          // so guard against that
          const suggestedText = response.data.matches[0] && response.data.matches[0].replacements[0].value || "";

          return {
            spellStart,
            textElement,
            text,
            spellEnd,
            suggestedText
          }
        })
    }));
}

const extractZipFile = (uploadPath, extractDir) => {
  return zl.extract(uploadPath, extractDir)
}

function saveUploadedFile(sampleFile, uploadPath) {
  return sampleFile.mv(uploadPath);
}

const readExtractedFile = extractDir => {
  return fse.readFile(path.join(extractDir, "word", "document.xml"))
}

const getTextFromDocxTextElement = textElement => textElement && textElement.elements && textElement.elements[0] && textElement.elements[0].elements && textElement.elements[0].elements[0] && textElement.elements[0].elements[0].text;

/**
 * @param {Element} textElement
 * @param {String} text
 * @modifies textElement
 */
const setTextFromDocxTextElement = (textElement, text) => {
  if (textElement && textElement.elements && textElement.elements[0] && textElement.elements[0].elements && textElement.elements[0].elements[0] && textElement.elements[0].elements[0].text) {
    textElement.elements[0].elements[0].text = text;
  }
}

/**
 * Updates in place the XML object that encodes the docx document file
 * by replacing the spelling mistakes with the fetched suggestions
 * @param {Element} xmlObj
 * @returns {function(any): string}
 * @modifies xmlObj, spellCheckResponses
 */
const applyTextSuggestions = xmlObj => spellCheckResponses => {
  spellCheckResponses.forEach(spellCheckResponse => {
    const {suggestedText, textElement} = spellCheckResponse;
    setTextFromDocxTextElement(textElement, suggestedText);
  });

  // Remove spell-check xml tags
  const indicesToDeleteByParentElement = spellCheckResponses.reduce((parentSpellTagIndexMap, spellCheckResponse) => {
    const {spellStart, spellEnd} = spellCheckResponse;

    // Per docx semantics, elements with `spellStart` and `spellEnd`
    // attributes may be siblings, hence have the same parent,
    // so we need to keep a hashmap of the indices to delete per parent
    const {parent} = spellStart;
    const indexSpellStart = parent.elements.findIndex(x => x === spellStart);
    if (indexSpellStart === -1) throw `Received possibly corrupted docx file.`
    const indexSpellEnd = parent.elements.findIndex(x => x === spellEnd);
    if (indexSpellEnd === -1) throw `Received possibly corrupted docx file.`

    parentSpellTagIndexMap.set(parent,
      (parentSpellTagIndexMap.get(parent) || [])
        .concat([indexSpellStart, indexSpellEnd])
    );

    return parentSpellTagIndexMap
  }, new Map());
  indicesToDeleteByParentElement.forEach((indicesToDelete, parentElement) => {
    const newParentElements = parentElement.elements.reduce((acc, element, index) => {
      if (indicesToDelete.indexOf(index) < 0) {
        return acc.concat(element)
      } else {
        return acc
      }
    }, []);
    parentElement.elements = newParentElements;
  });

  // Convert xml object back to string
  return xml2JS.js2xml(xmlObj, xmlParsingOptions);
}

module.exports = {
  isValidDocxFileRootContent,
  setTextFromDocxTextElement,
  retrieveSpellingErrors,
  getTextFromDocxTextElement,
  applyTextSuggestions,
  extractZipFile,
  readExtractedFile,
  saveUploadedFile,
  requestSpellChecks,
};
