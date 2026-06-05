export default [
  {
    "input": "src/_autoGen/openapi/user.openapi.json",
    "output": "src/_autoGen/api/user",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/system.openapi.json",
    "output": "src/_autoGen/api/system",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/resource.openapi.json",
    "output": "src/_autoGen/api/resource",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/document.openapi.json",
    "output": "src/_autoGen/api/document",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/file-storage.openapi.json",
    "output": "src/_autoGen/api/file-storage",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/fudan-extension.openapi.json",
    "output": "src/_autoGen/api/fudan-extension",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/note.openapi.json",
    "output": "src/_autoGen/api/note",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  },
  {
    "input": "src/_autoGen/openapi/ai-asset.openapi.json",
    "output": "src/_autoGen/api/ai-asset",
    "parser": {
      "transforms": {
        "enums": "root"
      }
    },
    "plugins": [
      {
        "enums": "javascript",
        "name": "@hey-api/typescript"
      }
    ]
  }
];
