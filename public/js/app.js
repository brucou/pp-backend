const StrictMode = React.StrictMode;
const render = ReactDOM.render;
const {useState, useRef} = React;

// Hyperscript helpers
const h = React.createElement;
const div = (a, b) => h("div", a, b);
const span = (a, b) => h("span", a, b);
const button = (a, b) => h("button", a, b);
const a = (a, b) => h("a", a, b);

// Constants
const baseURL = "http://localhost:3000/";
const rootElement = document.getElementById("root");
const INIT = "init";
const DOWNLOADED_CORRECTED_FILE = "dcf";
const CHECKING_GRAMMAR = "cg";
const REQUEST_FAILED = "rf";

// Helpers
function delay(n) {
  return new Promise(function (resolve) {
    setTimeout(resolve, n * 1000);
  });
}

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

// App
render(
  h(App, {}, null),
  rootElement
);

function App() {
  const initState = {
    controlState: "init",
    isFileDraggedOver: false,
    errorMessage: "",
    downloadURL: null
  };
  const axiosInstance = axios.create({baseURL});
  const [state, setState] = useState(initState);
  const {
    controlState,
    isFileDraggedOver,
    errorMessage,
    downloadURL
  } = state;
  console.log(`state`, state);

  const uploadFile = (axiosInstance, file) => requestUpload(axiosInstance, file)
    .then(url => {
      setState({...state, downloadURL: url, controlState: DOWNLOADED_CORRECTED_FILE})
    })
    .catch(e => {
      setState({...state, controlState: REQUEST_FAILED, errorMessage: e.toString()})
    });

  const componentToDisplay = (() => {
    switch (controlState) {

      case INIT:
        return h(Init, {
          isFileDraggedOver,
          onFileSelected: file => {
            setState({...state, downloadURL: null, controlState: CHECKING_GRAMMAR});
            uploadFile(axiosInstance, file);
          },
          onDragEnter: (event) => {
            setState({...state, isFileDraggedOver: true})
          },
          onDragLeave: (event) => {
            setState({...state, isFileDraggedOver: false})
          },
          onDragOver: (event) => {
          },
          onDrop: (file) => {
            setState({...state, isFileDraggedOver: false, controlState: CHECKING_GRAMMAR});
            uploadFile(axiosInstance, file);
          },
        }, null);

      case CHECKING_GRAMMAR:
        return h(CheckingGrammar, {}, null);

      case DOWNLOADED_CORRECTED_FILE:
        return h(Downloaded, {
          url: downloadURL,
          onRestart: (event) => setState(initState)
        }, null)

      case REQUEST_FAILED:
        return h(RequestFailed, {
          url: downloadURL,
          message: errorMessage,
          onRestart: (event) => setState(initState)
        }, null)

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
  return div({className: "checking-grammar primary"}, [
    span( {className: "loading loading--full-height"}, "Checking grammar"),
  ])
}

function Downloaded({url, onRestart}) {
  return div({className: "downloaded primary" }, [
    a( {href: url}, "Download corrected file"),
    button({
      className: "restart",
      onClick: onRestart
    }, "Restart")
  ])
}

function RequestFailed({url, message, onRestart}) {
  console.error(message);

  return div({className: ""}, [
    div({className: "error"}, `Server failed!`),
    button({onClick: onRestart}, "Restart")
  ])
}


