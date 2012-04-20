const nsIFilePicker       = Components.interfaces.nsIFilePicker;
const nsIProperties       = Components.interfaces.nsIProperties;
const NS_DIRECTORYSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const nsITreeBoxObject = Components.interfaces.nsITreeBoxObject;

Components.utils.import("chrome://imagegrabber/content/interfaces/FileView.jsm");

const nsITreeView = Components.interfaces.nsITreeView;
const nsILocalFile = Components.interfaces.nsILocalFile;
const nsIFile = Components.interfaces.nsIFile;
const NS_LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const NS_PROMPTSERVICE_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";

var sfile = Components.classes[NS_LOCAL_FILE_CONTRACTID].createInstance(nsILocalFile);
var retvals;
var filePickerMode = nsIFilePicker.modeGetFolder;
var homeDir;
var treeView;
var allowURLs;

var textInput;
var okButton;

var gFilePickerBundle;

// name of new directory entered by the user to be remembered
// for next call of newDir() in case something goes wrong with creation
var gNewDirName = { value: "" };

function filepickerLoad() {
	gFilePickerBundle = document.getElementById("bundle_filepicker");

	textInput = document.getElementById("textInput");
	okButton = document.documentElement.getButton("accept");

	treeView = new FileView();

	// var o = window.arguments[0];
	var o = window.arguments[0].wrappedJSObject;

	retvals = o.retvals; /* set this to a global var so we can set return values */
	const title = o.title;
	const directory = o.displayDirectory;

	document.title = title;
	allowURLs = o.allowURLs;

    var textInputLabel = document.getElementById("textInputLabel");
    textInputLabel.value = gFilePickerBundle.getString("dirTextInputLabel");
    textInputLabel.accessKey = gFilePickerBundle.getString("dirTextInputAccesskey");
  
    treeView.showOnlyDirectories = true;
	treeView.showHiddenFiles = true;

  // start out with a filename sort
  handleColumnClick("FilenameColumn");

  try {
    setOKAction();
  } catch (exception) {
    // keep it set to "OK"
  }

  // setup the dialogOverlay.xul button handlers
  retvals.buttonStatus = nsIFilePicker.returnCancel;

  var tree = document.getElementById("directoryTree");

  tree.treeBoxObject.view = treeView;

  // This allows the window to show onscreen before we begin
  // loading the file list
  setTimeout(setInitialDirectory, 0, directory);
}

function setInitialDirectory(directory)
{
  // Start in the user's profile directory
  var dirService = Components.classes[NS_DIRECTORYSERVICE_CONTRACTID]
                             .getService(nsIProperties);
  homeDir = dirService.get("ProfD", Components.interfaces.nsIFile);

  if (directory) {
    sfile.initWithPath(directory);
    if (!sfile.exists())
      directory = false;
  }
  if (!directory) {
    sfile.initWithPath(homeDir.path);
  }

  gotoDirectory(sfile);
}


function showErrorDialog(titleStrName, messageStrName, file)
{
  var errorTitle =
    gFilePickerBundle.getFormattedString(titleStrName, [file.path]);
  var errorMessage =
    gFilePickerBundle.getFormattedString(messageStrName, [file.path]);
  var promptService =
    Components.classes[NS_PROMPTSERVICE_CONTRACTID].getService(Components.interfaces.nsIPromptService);

  promptService.alert(window, errorTitle, errorMessage);
}

function openOnOK()
{
  var dir = treeView.selectedFiles[0];
  if (dir)
    gotoDirectory(dir);

  return false;
}

function selectOnOK()
{
  var errorTitle, errorMessage, promptService;
  var ret = nsIFilePicker.returnOK;

  var isDir = false;

  retvals.fileURL = null;

	if (ret != nsIFilePicker.returnCancel) {
		var file = fileList[0].QueryInterface(nsIFile);

    // try to normalize - if this fails we will ignore the error
    // because we will notice the
    // error later and show a fitting error alert.
    try{
      file.normalize();
    } catch(e) {
      //promptService.alert(window, "Problem", "normalize failed, continuing");
    }

    var fileExists = file.exists();

    if (!fileExists && filePickerMode == nsIFilePicker.modeGetFolder) {
      showErrorDialog("errorDirDoesntExistTitle",
                      "errorDirDoesntExistMessage",
                      file);
      return false;
    }

    if (fileExists)
      isDir = file.isDirectory();

	if (isDir) {
        retvals.directory = file.parent.path;
      } else { // if nothing selected, the current directory will be fine
        retvals.directory = sfile.path;
      }
    }

  retvals.buttonStatus = ret;
  
  return (ret != nsIFilePicker.returnCancel);
}

function onCancel()
{
  // Close the window.
  retvals.buttonStatus = nsIFilePicker.returnCancel;
  return true;
}

function onDblClick(e) {
  // we only care about button 0 (left click) events
  if (e.button != 0) return;

  var t = e.originalTarget;
  if (t.localName != "treechildren")
    return;

  openSelectedFile();
}

function openSelectedFile() {
  var fileList = treeView.selectedFiles;
  if (fileList.length == 0)
    return;

  var file = fileList[0];
  gotoDirectory(file);
}

function onClick(e) {
  var t = e.originalTarget;
  if (t.localName == "treecol")
    handleColumnClick(t.id);
}

function convertColumnIDtoSortType(columnID) {
  var sortKey;
  
  switch (columnID) {
  case "FilenameColumn":
    sortKey = FileView.sortName;
    break;
  case "FileSizeColumn":
    sortKey = FileView.sortSize;
    break;
  case "LastModifiedColumn":
    sortKey = FileView.sortDate;
    break;
  default:
    dump("unsupported sort column: " + columnID + "\n");
    sortKey = 0;
    break;
  }
  
  return sortKey;
}

function handleColumnClick(columnID) {
  var sortType = convertColumnIDtoSortType(columnID);
  var sortOrder = (treeView.sortType == sortType) ? !treeView.reverseSort : false;
  treeView.sort(sortType, sortOrder);
  
  // set the sort indicator on the column we are sorted by
  var sortedColumn = document.getElementById(columnID);
  if (treeView.reverseSort) {
    sortedColumn.setAttribute("sortDirection", "descending");
  } else {
    sortedColumn.setAttribute("sortDirection", "ascending");
  }
  
  // remove the sort indicator from the rest of the columns
  var currCol = sortedColumn.parentNode.firstChild;
  while (currCol) {
    if (currCol != sortedColumn && currCol.localName == "treecol")
      currCol.removeAttribute("sortDirection");
    currCol = currCol.nextSibling;
  }
}

function onKeypress(e) {
  if (e.keyCode == 8) /* backspace */
    goUp();

  /* enter is handled by the ondialogaccept handler */
}

function onTreeFocus(event) {
  // Reset the button label and enabled/disabled state.
  onFileSelected(treeView.selectedFiles);
}

function setOKAction(file) {
  var buttonLabel;
  var buttonIcon = "open"; // used in all but one case

    document.documentElement.setAttribute("ondialogaccept", "return openOnOK();");
    buttonLabel = gFilePickerBundle.getString("openButtonLabel");
  okButton.setAttribute("label", buttonLabel);
  okButton.setAttribute("icon", buttonIcon);
}

function onSelect(event) {
  onFileSelected(treeView.selectedFiles);
}

function onFileSelected(/* nsIArray */ selectedFileList) {
	var validFileSelected = false;
	var invalidSelection = false;
	var file;
	var fileCount = selectedFileList.length;

	// file = selectedFileList.queryElementAt(0, nsIFile);
	file = selectedFileList[0];

	if (file) {
	  var path = file.leafName;

	  if (path)
		  addToTextFieldValue(path);

	}

	setOKAction(file);
}

function addToTextFieldValue(path)
{
  textInput.value = ' "' + path.replace(/\"/g, "\\\"") + '"';
}

function onTextFieldFocus() {
  setOKAction(null);
}

function onDirectoryChanged(target)
{
  var path = target.getAttribute("label");

  var file = Components.classes[NS_LOCAL_FILE_CONTRACTID].createInstance(nsILocalFile);
  file.initWithPath(path);

  if (!sfile.equals(file)) {
    // Do this on a timeout callback so the directory list can roll up
    // and we don't keep the mouse grabbed while we are loading.

    setTimeout(gotoDirectory, 0, file);
  }
}

function populateAncestorList(directory) {
  var menu = document.getElementById("lookInMenu");

  while (menu.hasChildNodes()) {
    menu.removeChild(menu.firstChild);
  }
  
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("label", directory.path);
  menuItem.setAttribute("crop", "start");
  menu.appendChild(menuItem);

  // .parent is _sometimes_ null, see bug 121489.  Do a dance around that.
  var parent = directory.parent;
  while (parent && !parent.equals(directory)) {
    menuItem = document.createElement("menuitem");
    menuItem.setAttribute("label", parent.path);
    menuItem.setAttribute("crop", "start");
    menu.appendChild(menuItem);
    directory = parent;
    parent = directory.parent;
  }
  
  var menuList = document.getElementById("lookInMenuList");
  menuList.selectedIndex = 0;
}

function goUp() {
  try {
    var parent = sfile.parent;
  } catch(ex) { dump("can't get parent directory\n"); }

  if (parent) {
    gotoDirectory(parent);
  }
}

function goHome() {
  gotoDirectory(homeDir);
}

function newDir() {
  var file;
  var promptService =
    Components.classes[NS_PROMPTSERVICE_CONTRACTID].getService(Components.interfaces.nsIPromptService);
  var dialogTitle =
    gFilePickerBundle.getString("promptNewDirTitle");
  var dialogMsg =
    gFilePickerBundle.getString("promptNewDirMessage");
  var ret = promptService.prompt(window, dialogTitle, dialogMsg, gNewDirName, null, {value:0});

  if (ret) {
    file = processPath(gNewDirName.value);
    if (!file) {
      showErrorDialog("errorCreateNewDirTitle",
                      "errorCreateNewDirMessage",
                      file);
      return false;
    }
    
    file = file[0].QueryInterface(nsIFile);
    if (file.exists()) {
      showErrorDialog("errorNewDirDoesExistTitle",
                      "errorNewDirDoesExistMessage",
                      file);
      return false;
    }

    var parent = file.parent;
    if (!(parent.exists() && parent.isDirectory() && parent.isWritable())) {
      var oldParent = parent;
      while (!parent.exists()) {
        oldParent = parent;
        parent = parent.parent;
      }
      if (parent.isFile()) {
        showErrorDialog("errorCreateNewDirTitle",
                        "errorCreateNewDirIsFileMessage",
                        parent);
        return false;
      }
      if (!parent.isWritable()) {
        showErrorDialog("errorCreateNewDirTitle",
                        "errorCreateNewDirPermissionMessage",
                        parent);
        return false;
      }
    }

    try {
      file.create(nsIFile.DIRECTORY_TYPE, 0755); 
    } catch (e) {
      showErrorDialog("errorCreateNewDirTitle",
                      "errorCreateNewDirMessage",
                      file);
      return false;
    }
    file.normalize(); // ... in case ".." was used in the path
    gotoDirectory(file);
    // we remember and reshow a dirname if something goes wrong
    // so that errors can be corrected more easily. If all went well,
    // reset the default value to blank
    gNewDirName = { value: "" }; 
  }
  return true;
}

function gotoDirectory(directory) {
  window.setCursor("wait");
  try {
    populateAncestorList(directory);
    treeView.setDirectory(directory);
    document.getElementById("errorShower").selectedIndex = 0;
  } catch(ex) {
    document.getElementById("errorShower").selectedIndex = 1;
  }

  window.setCursor("auto");

  textInput.value = "";
  textInput.focus();
  textInput.setAttribute("autocompletesearchparam", directory.path);
  sfile = directory;
}

// from the current directory and whatever was entered
// in the entry field, try to make a new path. This
// uses "/" as the directory separator, "~" as a shortcut
// for the home directory (but only when seen at the start
// of a path), and ".." to denote the parent directory.
// returns an array of the files listed,
// or false if an error occurred.

function processPathEntry(path)
{
  var filePath;
  var file;
  
  var pD = ""; // path delimiter

  try {
    file = sfile.clone().QueryInterface(nsILocalFile);
  } catch(e) {
    dump("Couldn't clone\n"+e);
    return false;
  }
 
 // Determine if we need Windows style path or unix style path
	var temp_file = file.clone();
	try {
		temp_file.initWithPath("/");
		pD = "/";
	} catch (e) {
		pD = "\\"
	}

	filePath = path;
	if (pD == "/") {
	  var tilde_file = file.clone();
	  tilde_file.append("~");
	  if (path[0] == '~' &&                        // Expand ~ to $HOME, except:
		  !(path == "~" && tilde_file.exists()) && // If ~ was entered and such a file exists, don't expand
		  (path.length == 1 || path[1] == "/"))    // We don't want to expand ~file to ${HOME}file
		filePath = homeDir.path + path.substring(1);
	}
	
  // Unescape quotes
  filePath = filePath.replace(/\\\"/g, "\"");
  
  if (filePath[0] == '/' || filePath[3] == '\\')   /* an absolute path was entered */
    file.initWithPath(filePath);
  else if ((filePath.indexOf(pD + ".." + pD) > 0) ||
           (filePath.substr(-3) == (pD + "..")) ||
           (filePath.substr(0,3) == (".." + pD)) ||
           (filePath == "..")) {
    /* appendRelativePath doesn't allow .. */
    try{
      file.initWithPath(file.path + pD + filePath);
    } catch (e) {
      dump("Couldn't init path\n"+e);
      return false;
    }
  }
  else {
    try {
      file.appendRelativePath(filePath);
    } catch (e) {
      dump("Couldn't append path\n"+e);
      return false;
    }
  }

  return true;
}
