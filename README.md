# Requirements
- https://www.notion.so/Paperpile-full-stack-test-project-7953d77a7fe64de0a3c9c0bc9a2fa313

# Design
## API endpoint
Reminder: Express, REST APIs:

- It receives the uploaded file.
- It returns a download link.
- It actually serves the file when the browser requests the file from the download link.

So:

|API type| Description| 
|---|---|
| Get  | returns a file previously generated or not found|
| Post | gets the uploaded file and returns download link|

## Front-end
cf. [Figma file](https://www.figma.com/file/qX18aK9vyAtMS28qKf8nrG/Fullstack-test-project?node-id=0%3A1).

# Resources
## Spelling API
[spelling API](https://languagetool.org/http-api/#!/default/post_check):
  - can dry test spelling API
  - POST: check with `wrng` returns
```json
{
  "software": {
    "name": "LanguageTool",
    "version": "5.4-SNAPSHOT",
    "buildDate": "2021-06-02 14:22:33 +0000",
    "apiVersion": 1,
    "premium": true,
    "premiumHint": "You might be missing errors only the Premium version can find. Contact us at support<at>languagetoolplus.com.",
    "status": ""
  },
  "warnings": {
    "incompleteResults": false
  },
  "language": {
    "name": "English (US)",
    "code": "en-US",
    "detectedLanguage": {
      "name": "Polish",
      "code": "pl-PL",
      "confidence": 0.132
    }
  },
  "matches": [
    {
      "message": "Possible spelling mistake found.",
      "shortMessage": "Spelling mistake",
      "replacements": [
        {
          "value": "wrong"
        },
        {
          "value": "Wang"
        },
        {
          "value": "wing"
        },
        {
          "value": "Wong"
        },
        {
          "value": "RNG"
        },
        {
          "value": "wrung"
        },
        {
          "value": "wring"
        }
      ],
      "offset": 0,
      "length": 4,
      "context": {
        "text": "wrng",
        "offset": 0,
        "length": 4
      },
      "sentence": "wrng",
      "type": {
        "typeName": "Other"
      },
      "rule": {
        "id": "MORFOLOGIK_RULE_EN_US",
        "description": "Possible spelling mistake",
        "issueType": "misspelling",
        "category": {
          "id": "TYPOS",
          "name": "Possible Typo"
        },
        "isPremium": false
      },
      "ignoreForIncompleteSentence": false,
      "contextForSureMatch": 0
    }
  ]
}
```
  - request: 
```shell
## https://api.languagetoolplus.com/v2/check?text=wrng&language=en-US&enabledOnly=false
curl -X POST --header 'Content-Type: application/x-www-form-urlencoded' --header 'Accept: application/json' -d 'text=wrng&language=en-US&enabledOnly=false' 'https://api.languagetoolplus.com/v2/check'
```

NOTE: **running the previous command failed on Windows!**

  - response schema:
```json
{
  "software": {
    "name": "string",
    "version": "string",
    "buildDate": "string",
    "apiVersion": 0,
    "status": "string",
    "premium": true
  },
  "language": {
    "name": "string",
    "code": "string",
    "detectedLanguage": {
      "name": "string",
      "code": "string"
    }
  },
  "matches": [
    {
      "message": "string",
      "shortMessage": "string",
      "offset": 0,
      "length": 0,
      "replacements": [
        {
          "value": "string"
        }
      ],
      "context": {
        "text": "string",
        "offset": 0,
        "length": 0
      },
      "sentence": "string",
      "rule": {
        "id": "string",
        "subId": "string",
        "description": "string",
        "urls": [
          {
            "value": "string"
          }
        ],
        "issueType": "string",
        "category": {
          "id": "string",
          "name": "string"
        }
      }
    }
  ]
}
```

# Implementation
## Interesting links
- XML parser playground: https://jsonformatter.org/xml-parser#Sample
- XML libraries
  - https://github.com/SAP/xml-tools/tree/master/packages/ast
  - https://github.com/NaturalIntelligence/fast-xml-parser
  - playground: https://naturalintelligence.github.io/fast-xml-parser/
  - https://github.com/rgrove/parse-xml
- docx libraries   
  - https://github.com/lalalic/docx4js
  - mamooth
  - open office convert
  - some others, but we discarded all of them:
    - unmaintained, no tests, scarce docs, and one did not work with the buffer provided in the request (maybe required an array buffer?)

## Back-end
### Discrepancies vs. requirements
In places, the requirements left options open, and we took some decisions:
- The requirement *Read and extract the text of the first paragraph of the first page.* may not be strictly implemented. The program will look for spelling mistakes everywhere in the document. That means the requirement is fulfilled only if it did not mean to read and extract **only** the text of the first paragraph of the first page.
- we do not check that the file that is being uploaded is indeed a docx file.

## Front-end
We tried here to have a lean process without using `create-react-app` and a fully configured build environment. Instead, we use simple HTML, CSS, and JavaScript. For real production projects, naturally, a build configuration becomes valuable.

### Discrepancies vs. requirements
In places, the requirements left options open, and we took some decisions:
- we added an error screen that gives feedback to the user when a request to process the spelling mistakes in the document has failed.
- we also added limits to the documents that can be received to spare the backend (10 MB in the current implementation)

### Known issues
- accepts non-word files... `accept` property does not work?? We haven't found a way to intruct the browser file select input widget to only accept docx files. 

## Possible improvements
### Backend
- remove download file after a while has passed or some other criteria to free server space
- could do more to validate incoming data:
  - post request (we do not check that the file that is being uploaded is indeed a docx file)
  - spell checking response
- could run some extra tests for files with unsafe characters
- tests with a larger variety of docx files
- tests (unit, e2e)

### Front-end
- we do not check that the file that is being uploaded is indeed a docx file
- tests (unit, e2e)

### Development process
- Would be great if the Figma file would provide actual HTML/CSS that can be plugged in in the implementation. Currently only gives CSS, which generates some inefficiency in the handoff. 
