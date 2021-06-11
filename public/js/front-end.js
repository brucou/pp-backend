const axiosInstance = axios.create({
  baseURL: "http://localhost:3000/",
});

const submitHandler = ({selectedFiles, setError, axiosInstance}) => (e) => {
  e.preventDefault(); //prevents the form from submitting
  let formData = new FormData();

  formData.append("file", selectedFiles[0]);
  axiosInstance
    .post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (data) => {
        //Set the progress value to show the progress bar
        console.log(`progress`, (Math.round((100 * data.loaded) / data.total)));
      },
    })
    .then(res => {
      console.log(`result`, res)
    })
    .catch((error) => {
      const {code} = error && error.response && error.response.data;
      switch (code) {
        case "FILE_MISSING":
          console.error("Please select a file before uploading!");
          break;
        case "LIMIT_FILE_SIZE":
          console.error("File size is too large. Please upload files below 1MB!");
          break;
        case "INVALID_TYPE":
          console.error(
            "This file type is not supported! Only .png, .jpg and .jpeg files are allowed"
          );
          break;

        default:
          console.error("Sorry! Something went wrong. Please try again later");
          break;
      }
    })
};

window.onload = function () {
  const dropzone = document.getElementById("dropzone");
  dropzone.ondragover = dropzone.ondragenter = function (event) {
    event.stopPropagation();
    event.preventDefault();
  };

  dropzone.ondrop = function (event) {
    event.stopPropagation();
    event.preventDefault();

    const selectedFiles = event.dataTransfer.files;
    const setError = () => {
    };
    submitHandler({selectedFiles, setError, axiosInstance})({
      preventDefault: () => {
      }
    })
  }
};

const fileSelect = document.getElementById("fileSelect"),
  fileElem = document.getElementById("fileElem");

fileSelect.addEventListener("click", function (e) {
  if (fileElem) {
    fileElem.click();
  }

  fileElem.addEventListener("change", handleFiles, false);

  function handleFiles() {
    const selectedFiles = this.files;
    const setError = () => {
    };
    submitHandler({selectedFiles, setError, axiosInstance})({
      preventDefault: () => {
      }
    });
  }

}, false);

