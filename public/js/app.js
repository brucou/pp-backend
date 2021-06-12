const StrictMode = React.StrictMode;
const render = ReactDOM.render;
const {useState, useRef} = React;

// Hyperscript helpers
// Cf. https://reactjs.org/docs/react-without-jsx.html
const h = React.createElement;
const div = (a, b) => h("div", a, b);
const span = (a, b) => h("span", a, b);
const button = (a, b) => h("button", a, b);
const a = (a, b) => h("a", a, b);

// Properties
const baseURL = "http://localhost:3000/";
const rootElement = document.getElementById("root");

// Control states
const INIT = "init";
const FILE_AVAILABLE_FOR_DOWNLOAD = "fafd";
const CHECKING_GRAMMAR = "cg";
const REQUEST_FAILED = "rf";

// Events
const STARTED_APP = "sa";
const SELECTED_FILE = "sf";
const ENTERED_DROP_ZONE = "edz";
const LEFT_DROP_ZONE = "ldz";
const DROPPED_FILE_IN_DROP_ZONE = "dfidz";
const CLICKED_RESTART = "cr";
const REQUEST_SUCCEEDED = "rs";
// Yeah that's just to avoid same moniker as REQUEST_FAILED control state
const REQUEST_ERRORED = "re";

// Commands
const RENDER = "ctr";
const UPLOAD_FILE = "ctuf";

// Helpers

function requestUpload(axiosInstance, file) {
  let formData = new FormData();

  formData.append("file", file);
  return axiosInstance
    .post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then(res => res.data && res.data.url)
}

/**
 * Takes an event and computes actions to perform. Actions are of two kinds:
 * - updates the application state
 * - execute effects
 * Elm/Redux/Kingly(state machine) inspired.
 * @param {{type: String, data: *}} event
 * @param {*} state Application state
 * @returns {{updates: {downloadURL: null, controlState: string}, commands: [{type: string, params}]}|{updates, commands: [{type: string, params}]}}
 */
function controller(event, state) {
  const {type, data} = event;
  switch (type) {
    case STARTED_APP: {
      const initState = data;
      return {
        updates: initState,
        commands: [{type: RENDER, params: initState}]
      }
    }

    case ENTERED_DROP_ZONE: {
      const updates = {isFileDraggedOver: true};
      return {
        updates,
        commands: [
          {type: RENDER, params: updates}
        ]
      }
    }

    case LEFT_DROP_ZONE: {
      const updates = {isFileDraggedOver: false};
      return {
        updates,
        commands: [
          {type: RENDER, params: updates}
        ]
      }
    }

    case DROPPED_FILE_IN_DROP_ZONE: {
      const file = data;
      const updates = {isFileDraggedOver: false, controlState: CHECKING_GRAMMAR};
      return {
        updates,
        commands: [
          {type: UPLOAD_FILE, params: file},
          {type: RENDER, params: updates},
        ]
      }
    }

    case SELECTED_FILE: {
      const file = data;
      const updates = {downloadURL: null, controlState: CHECKING_GRAMMAR};
      return {
        updates,
        commands: [
          {type: UPLOAD_FILE, params: file},
          {type: RENDER, params: updates}
        ]
      }
    }

    case CLICKED_RESTART: {
      const updates = initState;
      return {
        updates,
        commands: [{type: RENDER, params: updates}]
      }
    }

    case REQUEST_ERRORED: {
      const err = data;
      // In the end, we don't show that to the user
      // const htmlMessage = err && err.response && err.response.data || "Error!";
      const updates = {downloadURL: null, controlState: REQUEST_FAILED};
      return {
        updates,
        commands: [{type: RENDER, params: updates}]
      }
    }

    case REQUEST_SUCCEEDED: {
      const url = data;
      const updates = {downloadURL: url, controlState: FILE_AVAILABLE_FOR_DOWNLOAD};
      return {
        updates,
        commands: [{type: RENDER, params: updates}]
      }
    }

  }
}

const axiosInstance = axios.create({baseURL});
const createEffectHandlers = (axiosInstance) => ({
  [RENDER]: (_, updatedState, __) => {
    render(
      h(StrictMode, {}, [
        h(App, {...updatedState}, null),
      ]),
      rootElement
    );
  },
  [UPLOAD_FILE]: (file, _, dispatch) => requestUpload(axiosInstance, file)
    .then(url => dispatch({type: REQUEST_SUCCEEDED, data: url}))
    .catch(err => dispatch({type: REQUEST_ERRORED, data: err}))
});
const effectHandlers = createEffectHandlers(axiosInstance);

const createCommandHandler = (effectHandlers) => (commands, updatedState, dispatch) => {
  if (!commands) return;

  commands.forEach(({type, params}) => effectHandlers[type](params, updatedState, dispatch));
};

/**
 * Should be non-destructive, i.e. at the very least shallow-copy
 * @param {*} state
 * @param {*} stateUpdates
 * @returns {*} updated state
 */
const updateState = (state, stateUpdates) => ({...state, ...stateUpdates});
const commandHandler = createCommandHandler(effectHandlers);

let appState = {};
const createDispatcher = (commandHandler, controller, updateState) => {
  const dispatch = (event) => {
    const {updates, commands} = controller(event, appState);
    appState = updateState(appState, updates);
    commandHandler(commands, appState, dispatch);
  }

  return dispatch
};

const dispatch = createDispatcher(commandHandler, controller, updateState);

// Kick-off the app with the initial rendering
const initState = {
  controlState: "init",
  isFileDraggedOver: false,
  downloadURL: null
};
dispatch({type: STARTED_APP, data: initState});

function App({controlState, isFileDraggedOver, downloadURL}) {
  // TODO: update
  const setState = () => {
  };

  const componentToDisplay = (() => {
    switch (controlState) {

      case INIT:
        return h(Init, {
          isFileDraggedOver,
          onFileSelected: (file) => dispatch({type: SELECTED_FILE, data: file}),
          onDragEnter: (event) => dispatch({type: ENTERED_DROP_ZONE, data: void 0}),
          onDragLeave: (event) => dispatch({type: LEFT_DROP_ZONE, data: void 0}),
          onDrop: (file) => dispatch({type: DROPPED_FILE_IN_DROP_ZONE, data: file}),
        }, null);

      case CHECKING_GRAMMAR:
        return h(CheckingGrammar, {}, null);

      case FILE_AVAILABLE_FOR_DOWNLOAD:
        return (
          h(DownloadPrompt, {
            url: downloadURL,
            onRestart: (event) => dispatch({type: CLICKED_RESTART, data: void 0})
          }, null)
        )

      case REQUEST_FAILED:
        return (
          h(RequestFailed, {
            onRestart: (event) => dispatch({type: CLICKED_RESTART, data: void 0})
          }, null)
        )

      default:
        return null
    }
  })();

  return (
    div({className: "app"}, [
      componentToDisplay
    ])
  );
}

function Init({isFileDraggedOver, onFileSelected, onDrop, onDragEnter, onDragLeave}) {
  const nativeFileSelectButtonRef = useRef(null);

  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();

    onDragEnter(e);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();

    onDragLeave(e);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();

    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();

    let file = [...e.dataTransfer.files][0];
    onDrop(file);

    // if (files && files.length > 0) {
    //   const existingFiles = data.fileList.map(f => f.name)
    //   files = files.filter(f => !existingFiles.includes(f.name))
    //
    //   dispatch({ type: 'ADD_FILE_TO_LIST', files });
    //   dispatch({ type: 'SET_DROP_DEPTH', dropDepth: 0 });
    //   dispatch({ type: 'SET_IN_DROP_ZONE', inDropZone: false });
    // }
  };

  return div({
    className: "init dropzone ".concat(isFileDraggedOver ? " dragged-over" : ""),
    onDragOver: e => handleDragOver(e),
    onDrop: e => handleDrop(e),
    onDragEnter: e => handleDragEnter(e),
    onDragLeave: e => handleDragLeave(e)
  }, [
    div({}, "Drop Word file here"),
    div({className: "or"}, "or"),
    button({
      className: "file-select",
      onClick: (ev) => {
        nativeFileSelectButtonRef.current.click();
      }
    }, "Choose Word file..."),
    h("input", {
      ref: nativeFileSelectButtonRef,
      className: "invisible",
      id: "fileElem",
      type: "file",
      accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword",
      onChange: (ev) => {
        ev.preventDefault();
        const selectedFiles = nativeFileSelectButtonRef.current.files;
        onFileSelected(selectedFiles[0]);
      }
    }, null)
  ])
}

function CheckingGrammar({}) {
  return (
    div({className: "checking-grammar primary"}, [
      span({className: "loading loading--full-height"}, "Checking grammar"),
    ])
  )
}

function DownloadPrompt({url, onRestart}) {
  return (
    div({className: "downloaded primary"}, [
      a({href: url, "aria-label": "file download link"}, "Download corrected file"),
      button({
        className: "restart",
        onClick: onRestart
      }, "Restart")
    ]))
}

function RequestFailed({onRestart}) {
  // ADR:
  // In the end, we don't show a more descriptive error message to the user.
  // A more detailed error message is available in the network tab
  // of the console.
  return (
    div({className: ""}, [
      div({className: "error"}, `Server failed!`),
      button({onClick: onRestart}, "Restart")
    ]))
}


