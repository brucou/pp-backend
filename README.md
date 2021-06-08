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

## Functional breakdown
- REST logic
  - express stuff: parse the incoming requests
  - Get -> standard stuff (cf. router)
  - Post -> file processing function
    - https://github.com/richardgirges/express-fileupload/tree/master/example
- File processing function
  - input: DOCX file, output: download link
  - parse DOCX file
  - for each mispelled word, look for corrections
    - use a cache? or browser automatically does this?
  - for every correction(s) found, pick the first one and replace wrong with good
    - check DOMParser API for node
    - XML parser playground: https://jsonformatter.org/xml-parser#Sample
    - probably can use this to read the XML into an AST but not to replace text
      - https://github.com/SAP/xml-tools/tree/master/packages/ast
      - https://github.com/NaturalIntelligence/fast-xml-parser
        - playground: https://naturalintelligence.github.io/fast-xml-parser/
      - https://github.com/rgrove/parse-xml
    - actually use docx4js to get the docx, check the shape of it and decide
      - https://github.com/lalalic/docx4js
  - convert back to DOCX
  - generate link
    - use unique link UUID?
  - write DOCX to file
    - in public directory? or in router directory? check express router docs

## Scheduling
- 

## Issues
### Front-end
- accepts non-word files... `accept` property does not work??

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
