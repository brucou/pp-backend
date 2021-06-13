const {
  STARTED_APP,
  createDispatcher,
  SELECTED_FILE,
  ENTERED_DROP_ZONE,
  LEFT_DROP_ZONE,
  DROPPED_FILE_IN_DROP_ZONE,
  CLICKED_RESTART,
  REQUEST_SUCCEEDED,
  REQUEST_ERRORED,
  RENDER,
  UPLOAD_FILE,
  INIT,
  FILE_AVAILABLE_FOR_DOWNLOAD,
  CHECKING_GRAMMAR,
  REQUEST_FAILED,
  initState,
  controller,
  updateState,
} = paperFile;

const createFakeCommandHandler = mutArray => (commands, appState, dispatch) => {
  mutArray.push(commands.map(command => {
    if (command.type === RENDER) return {type: RENDER, params: appState}
    return command
  }));
};

QUnit.module('Core user scenarios', function () {
  QUnit.test('user navigates to app', function (assert) {
    const userScenario = [{type: STARTED_APP, data: initState}];
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [[{type: RENDER, params: initState}]]);
  });

  QUnit.test('user selects file, successfully downloads spell-checked file, and restarts', function (assert) {
    const file = "file";
    const url = "url";
    const userScenario = [
      {type: STARTED_APP, data: initState},
      {type: SELECTED_FILE, data: file},
      {type: REQUEST_SUCCEEDED, data: url},
      {type: CLICKED_RESTART, data: void 0}
    ]
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [
      [{type: RENDER, params: initState}],
      [
        {type: UPLOAD_FILE, params: file},
        {
          type: RENDER, params: {
            ...initState,
            controlState: CHECKING_GRAMMAR, downloadURL: null
          }
        },
      ],
      [{
        type: RENDER, params: {
          ...initState,
          controlState: FILE_AVAILABLE_FOR_DOWNLOAD, downloadURL: url
        }
      }],
      [{type: RENDER, params: initState}],
    ]);
  })

  QUnit.test('user drag and drops file, successfully downloads spell-checked file, and restarts', function (assert) {
    const file = "file";
    const url = "url";
    const userScenario = [
      {type: STARTED_APP, data: initState},
      {type: ENTERED_DROP_ZONE, data: void 0},
      {type: DROPPED_FILE_IN_DROP_ZONE, data: file},
      {type: REQUEST_SUCCEEDED, data: url},
      {type: CLICKED_RESTART, data: void 0}
    ]
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [
      [{type: RENDER, params: initState}],
      [{type: RENDER, params: {...initState, isFileDraggedOver: true}}],
      [
        {type: UPLOAD_FILE, params: file},
        {
          type: RENDER, params: {
            ...initState,
            controlState: CHECKING_GRAMMAR, downloadURL: null
          }
        },
      ],
      [{
        type: RENDER, params: {
          ...initState,
          controlState: FILE_AVAILABLE_FOR_DOWNLOAD, downloadURL: url
        }
      }],
      [{type: RENDER, params: initState}],
    ]);
  })
});

QUnit.module('Error user scenarios', function () {
  QUnit.test('user selects malformed docx file, is notified of server error, and restarts', function (assert) {
    const file = "file";
    const url = "url";
    const err = "err";
    const userScenario = [
      {type: STARTED_APP, data: initState},
      {type: SELECTED_FILE, data: file},
      {type: REQUEST_ERRORED, data: err},
      {type: CLICKED_RESTART, data: void 0}
    ]
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [
      [{type: RENDER, params: initState}],
      [
        {type: UPLOAD_FILE, params: file},
        {
          type: RENDER, params: {
            ...initState,
            controlState: CHECKING_GRAMMAR, downloadURL: null
          }
        },
      ],
      [{
        type: RENDER, params: {
          ...initState,
          controlState: REQUEST_FAILED,
        }
      }],
      [{type: RENDER, params: initState}],
    ]);
  })

  QUnit.test('user drags and drops malformed docx file, is notified of server error, and restarts', function (assert) {
    const file = "file";
    const url = "url";
    const userScenario = [
      {type: STARTED_APP, data: initState},
      {type: ENTERED_DROP_ZONE, data: void 0},
      {type: DROPPED_FILE_IN_DROP_ZONE, data: file},
      {type: REQUEST_ERRORED, data: void 0},
      {type: CLICKED_RESTART, data: void 0}
    ]
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [
      [{type: RENDER, params: initState}],
      [{type: RENDER, params: {...initState, isFileDraggedOver: true}}],
      [
        {type: UPLOAD_FILE, params: file},
        {
          type: RENDER, params: {
            ...initState,
            controlState: CHECKING_GRAMMAR, downloadURL: null
          }
        },
      ],
      [{
        type: RENDER, params: {
          ...initState,
          controlState: REQUEST_FAILED,
        }
      }],
      [{type: RENDER, params: initState}],
    ]);
  })
});

QUnit.module('Drag and drop user scenarios', function () {
  QUnit.test('user navigates to app, enters and leave file drop zone', function (assert) {
    const file = "file";
    const url = "url";
    const err = "err";
    const userScenario = [
      {type: STARTED_APP, data: initState},
      {type: ENTERED_DROP_ZONE, data: void 0},
      {type: LEFT_DROP_ZONE, data: void 0},
      {type: ENTERED_DROP_ZONE, data: void 0},
      {type: DROPPED_FILE_IN_DROP_ZONE, data: file},
    ];
    let appBehavior = [];
    const commandHandler = createFakeCommandHandler(appBehavior);
    const dispatch = createDispatcher(commandHandler, controller, updateState);

    userScenario.forEach(dispatch);

    assert.deepEqual(appBehavior, [
      [{type: RENDER, params: initState}],
      [{type: RENDER, params: {...initState, isFileDraggedOver: true}}],
      [{type: RENDER, params: {...initState, isFileDraggedOver: false}}],
      [{type: RENDER, params: {...initState, isFileDraggedOver: true}}],
      [
        {type: UPLOAD_FILE, params: file},
        {
          type: RENDER, params: {
            ...initState,
            controlState: CHECKING_GRAMMAR, downloadURL: null
          }
        },
      ],
    ]);
  })
});
