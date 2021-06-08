const submitHandler = (e) => {
  e.preventDefault(); //prevent the form from submitting
  let formData = new FormData();

  formData.append("file", selectedFiles[0]);
  //Clear the error message
  setError("");
  axiosInstance
    .post("/upload_file", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (data) => {
        //Set the progress value to show the progress bar
        setProgress(Math.round((100 * data.loaded) / data.total));
      },
    })
    .catch((error) => {
      const { code } = error?.response?.data;
      switch (code) {
        case "FILE_MISSING":
          setError("Please select a file before uploading!");
          break;
        case "LIMIT_FILE_SIZE":
          setError("File size is too large. Please upload files below 1MB!");
          break;
        case "INVALID_TYPE":
          setError(
            "This file type is not supported! Only .png, .jpg and .jpeg files are allowed"
          );
          break;

        default:
          setError("Sorry! Something went wrong. Please try again later");
          break;
      }
    });
};

window.onload = function() {
  const dropzone = document.getElementById("dropzone");
  dropzone.ondragover = dropzone.ondragenter = function(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  dropzone.ondrop = function(event) {
    event.stopPropagation();
    event.preventDefault();

    const filesArray = event.dataTransfer.files;
    for (let i=0; i<filesArray.length; i++) {
      sendFile(filesArray[i]);
    }
  }
}

const fileSelect = document.getElementById("fileSelect"),
  fileElem = document.getElementById("fileElem");

fileSelect.addEventListener("click", function (e) {
  if (fileElem) {
    fileElem.click();
  }

fileElem.addEventListener("change", handleFiles, false);
function handleFiles() {
  const fileList = this.files; /* now you can work with the file list */
  console.log(`filelist`, fileList)
  // TODO: here have to submit
}

}, false);

