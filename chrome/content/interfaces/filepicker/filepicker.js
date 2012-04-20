const nsIFilePicker       = Components.interfaces.nsIFilePicker;
const nsIProperties       = Components.interfaces.nsIProperties;
const NS_DIRECTORYSERVICE_CONTRACTID = "@mozilla.org/file/directory_service;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const nsITreeBoxObject = Components.interfaces.nsITreeBoxObject;

// Components.utils.import("chrome://imagegrabber/content/interfaces/FileView.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const nsITreeView = Components.interfaces.nsITreeView;
const nsILocalFile = Components.interfaces.nsILocalFile;
const nsIFile = Components.interfaces.nsIFile;
const NS_LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";
const NS_PROMPTSERVICE_CONTRACTID = "@mozilla.org/embedcomp/prompt-service;1";
const ROOT_ELEMENT = "\\\\.";

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

	// For now, DirTreeView runs .init() when "path" is set to ROOT_ELEMENT
	treeView = new DirTreeView(ROOT_ELEMENT);

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

	// setup the dialogOverlay.xul button handlers
	retvals.buttonStatus = nsIFilePicker.returnCancel;

	var tree = document.getElementById("directoryTree");

	tree.treeBoxObject.view = treeView;
}

function DirTreeView(directory) {
	this._childDirs = [];
	this._directory = null;
	
	DirTreeView._top = null;
	DirTreeView._rows = [];
	
	this.directory = directory;
	
	// nsIFile does not tell if the directory is readble with "isReadable" method
	try { var dirEntries = this._directory.directoryEntries; }
	catch(e) {
		if (e.name == "NS_ERROR_FILE_ACCESS_DENIED") {
			this.readable = false;
			this.writable = false;
			this.errors.push(e.name);
			return;
		}
		else throw(e)
	}
	
	while (dirEntries.hasMoreElements()) {
		var next = dirEntries.getNext().QueryInterface(Components.interfaces.nsIFile);
		
		// Some windows files do not play nice with nsIFile, i.e. the pagefile
		// But we don't care about those; we just want the directories
		try { var isDir = next.isDirectory(); }
		catch (e) {
			if (e.name == "NS_ERROR_FILE_NOT_FOUND") continue;
			else throw(e);
		}
		if (isDir) this._childDirs.push(next);
	}
	
	if (directory == ROOT_ELEMENT) this.init();
}

DirTreeView.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsITreeView]),

	/* properties for internal processing */
	dirLevel: -1,
	isExpanded: false,
	rowIdx: -1,

	get hasParentDir() { return this.parentDir != null; },
	get parentDir() { return this._directory.parent; },
	get hasChildren() { return this._childDirs.length > 0; },
	get rowCount() { this.rows.length; },
	get parentRowIdx() { return this.parent.rowIdx; },

	/* properties for external processing */
    treeBox: null,
    setTree: function(treeBoxObject) { this.treeBox = treeBoxObject; },    
	get selectedDirectory() { 
		var row = this.selection.currentIndex;
		if (row < this.rowCount) return this.rows[row].directory;
	},
	
	/* properties for the current directory */
	get directory() { return this._directory; },
	set directory(path) { 
		if (path instanceof nsILocalFile) this._directory = path;
		else if (typeof(path) == "string" || path instanceof String) {
			this._directory = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
			this._directory.initWithPath(path);
			dump(path + "\n");
		}
		else throw("ImageHost Grabber: new DirTreeView needs either a string path or an nsILocalFile type passed at object creation");
	},
	get path() { return this._directory.path; },
	get leafName() { return this._directory.leafName; },

	/* permission properties */
	readable: true,
	writable: true,
	
	/* error messages */
	errors: [],
	
	/* properties for object linking */
	get top() { return DirTreeView._top; },
	set top(value) { return DirTreeView._top = value; },
	get rows() { return DirTreeView._rows; },
	set rows(value) { return DirTreeView._rows = value; },

	get siblings() { return this.parent.children; },
	get prevSibling() { return this.parent.prevChild; },
	get nextSibling() { return this.parent.nextChild; },
	get firstSibling() { return this.parent.firstChild; },
	get lastSibling() { return this.parent.lastChild; },
	get isLastSibling() { return !(this == this.lastSibling); },
	
	parent: null,
	
	children: null,
	prevChild: null,
	nextChild: null,
	firstChild: null,
	lastChild: null,
	
	get firstRow() { return this.top.firstChild; },
	get nextRow() {
		var objRef = null;
		
		if (this.isExpanded == false) {
			if (this.isLastSibling == true) objRef = this.nextSibling;
			else objRef = this.parent.nextSibling;
		}
		else objRef = this.firstChild;
	},

	/* properties for nsITreeView */
	getRowProperties: function(row, props) {},
	getColumnProperties: function(row, props) {},
	getCellProperties: function(row, col, props) { props.AppendElement(ATOM_DIR); },

	hasNextSibling: function(row, after) { return this.rows[row].isLastSibling; },

	isContainer: function(row) { return this.rows[row].hasChildren; },
	isContainerOpen: function(row) { return this.rows[row].isExpanded; },  
	isContainerEmpty: function(row) { return false; },  
	isSeparator: function(row) { return false; },

	isSorted: function() {},
	getImageSrc: function(row,col) { return null; },

	isEditable: function(row, column)  { return false; },

	getParentIndex: function(row) { return this.rows[row].parentRowIdx; },
	getLevel: function(row) { return this.rows[row].dirLevel; },
	getCellText: function(row, col) { return this.rows[row].leafName; },
	
    toggleOpenState: function(row) {
		var item = this.rows[row];
		if (!item.hasChildren) return;

		if (item.isExpanded) {  
			item.isExpanded = false;
			var start = item.firstChild.rowIdx;
			var len = item.children.length;
			item.setIndices(item);
			item.treeBox.rowCountChanged(start, -len);
		}  
        else {  
			item.isExpanded = true;  
			item.getChildDirs();
			item.setIndices(item);
			var start = item.firstChild.rowIdx;
			var len = item.children.length;
			this.treeBox.rowCountChanged(start, len);
		}  

        this.treeBox.invalidateRow(row);  
      },  	  
    
	/* methods */
	init: function() {
		dump("in init\n");
		this.top = this;
		dump("top: " + this.top + "\n");
		this.getChildDirs();
		dump("firstRow: " + this.firstRow + "\n");
		dump("firstChild: " + this.firstChild + "\n");
		dump("children[0]: " + this.children[0] + "\n");
		this.setIndices();
	},
	
	setIndices: function(startRow) {
		var maxIter = 10000, i = 0;
dump("startRow: " + startRow + "\n");		
		if (startRow != null) {
			var row = startRow;
			var rows = this.rows.slice(0, startRow.rowIdx);
		}
		else {
			var row = this.firstRow;
			var rows = [];
		}
dump(row+"\n");
		while ( (i < maxIter) && (row != null) ) {
			i++;
			var rowIdx = rows.push(row) - 1;
			row.rowIdx = rowIdx;
			row = row.nextRow;
			dump(row+"\n")
		}
		
		this.rows = rows;
		dump("in setIndices, rows: " + rows + "\nthis.rows: " + this.rows + "\n");
	},
	
	getChildDirs: function() {
	dump("in getChildDirs, hasChildren" + this.hasChildren + "\n");
	dump("this._childDirs" + this._childDirs + "\n");
		if (!this.hasChildren) return null;
		dump("test in getChildDirs " + this.children != null + "\n");
		if (this.children != null) return this.children;
		
		var childs = [];
		
		for (var i = 0; i < this._childDirs.length; i++) {
			var dElem = new DirTreeView(this._childDirs[i]);
			dElem.parent = this;
			dElem.dirLevel = this.dirLevel + 1;
			childs.push(dElem);
		}

		for (var i = 0; i < childs.length; i++) {
			childs[i].firstChild = childs[0];
			childs[i].lastChild = childs[childs.length-1];
			childs[i].prevChild = (i > 0)?childs[i-1]:null;
			childs[i].nextChild = (i < (childs.length-1))?childs[i+1]:null;
		}
		dump("in getChildDirs: " + childs + "\n");
		return this.children = childs;
	}
}
	

// function setInitialDirectory(directory)
// {
  // // Start in the user's profile directory
  // var dirService = Components.classes[NS_DIRECTORYSERVICE_CONTRACTID]
                             // .getService(nsIProperties);
  // homeDir = dirService.get("ProfD", Components.interfaces.nsIFile);

  // if (directory) {
    // sfile.initWithPath(directory);
    // if (!sfile.exists())
      // directory = false;
  // }
  // if (!directory) {
    // sfile.initWithPath(homeDir.path);
  // }

  // gotoDirectory(sfile);
// }


// function showErrorDialog(titleStrName, messageStrName, file)
// {
  // var errorTitle =
    // gFilePickerBundle.getFormattedString(titleStrName, [file.path]);
  // var errorMessage =
    // gFilePickerBundle.getFormattedString(messageStrName, [file.path]);
  // var promptService =
    // Components.classes[NS_PROMPTSERVICE_CONTRACTID].getService(Components.interfaces.nsIPromptService);

  // promptService.alert(window, errorTitle, errorMessage);
// }

// function openOnOK()
// {
  // var dir = treeView.selectedDirectory[0];
  // if (dir)
    // gotoDirectory(dir);

  // return false;
// }

// function selectOnOK()
// {
  // var errorTitle, errorMessage, promptService;
  // var ret = nsIFilePicker.returnOK;

  // var isDir = false;

  // retvals.fileURL = null;

	// if (ret != nsIFilePicker.returnCancel) {
		// var file = fileList[0].QueryInterface(nsIFile);

    // // try to normalize - if this fails we will ignore the error
    // // because we will notice the
    // // error later and show a fitting error alert.
    // try{
      // file.normalize();
    // } catch(e) {
      // //promptService.alert(window, "Problem", "normalize failed, continuing");
    // }

    // var fileExists = file.exists();

    // if (!fileExists && filePickerMode == nsIFilePicker.modeGetFolder) {
      // showErrorDialog("errorDirDoesntExistTitle",
                      // "errorDirDoesntExistMessage",
                      // file);
      // return false;
    // }

    // if (fileExists)
      // isDir = file.isDirectory();

	// if (isDir) {
        // retvals.directory = file.parent.path;
      // } else { // if nothing selected, the current directory will be fine
        // retvals.directory = sfile.path;
      // }
    // }

  // retvals.buttonStatus = ret;
  
  // return (ret != nsIFilePicker.returnCancel);
// }

// function onCancel()
// {
  // // Close the window.
  // retvals.buttonStatus = nsIFilePicker.returnCancel;
  // return true;
// }


// function onKeypress(e) {
  // if (e.keyCode == 8) /* backspace */
    // goUp();

  // /* enter is handled by the ondialogaccept handler */
// }

// function onTreeFocus(event) {
	// var selectedDirectory = treeView.selectedDirectory;
	// addToTextFieldValue(selectedDirectory.path);
	// setOKAction(selectedDirectory);
// }

// function setOKAction(selectedDirectory) {
	// var buttonLabel;
	// var buttonIcon = "open"; // used in all but one case

	// document.documentElement.setAttribute("ondialogaccept", "return openOnOK();");
	// buttonLabel = gFilePickerBundle.getString("openButtonLabel");
	// okButton.setAttribute("label", buttonLabel);
	// okButton.setAttribute("icon", buttonIcon);
// }

// function onSelect(event) {
	// var selectedDirectory = treeView.selectedDirectory;
	// addToTextFieldValue(selectedDirectory.path);
	// setOKAction(selectedDirectory);
// }

// function addToTextFieldValue(path)
// {
  // textInput.value = ' "' + path.replace(/\"/g, "\\\"") + '"';
// }

// function onTextFieldFocus() {
  // setOKAction(null);
// }

// function onDirectoryChanged(target)
// {
  // var path = target.getAttribute("label");

  // var file = Components.classes[NS_LOCAL_FILE_CONTRACTID].createInstance(nsILocalFile);
  // file.initWithPath(path);

  // if (!sfile.equals(file)) {
    // // Do this on a timeout callback so the directory list can roll up
    // // and we don't keep the mouse grabbed while we are loading.

    // setTimeout(gotoDirectory, 0, file);
  // }
// }

// function populateAncestorList(directory) {
  // var menu = document.getElementById("lookInMenu");

  // while (menu.hasChildNodes()) {
    // menu.removeChild(menu.firstChild);
  // }
  
  // var menuItem = document.createElement("menuitem");
  // menuItem.setAttribute("label", directory.path);
  // menuItem.setAttribute("crop", "start");
  // menu.appendChild(menuItem);

  // // .parent is _sometimes_ null, see bug 121489.  Do a dance around that.
  // var parent = directory.parent;
  // while (parent && !parent.equals(directory)) {
    // menuItem = document.createElement("menuitem");
    // menuItem.setAttribute("label", parent.path);
    // menuItem.setAttribute("crop", "start");
    // menu.appendChild(menuItem);
    // directory = parent;
    // parent = directory.parent;
  // }
  
  // var menuList = document.getElementById("lookInMenuList");
  // menuList.selectedIndex = 0;
// }

// function goUp() {
  // try {
    // var parent = sfile.parent;
  // } catch(ex) { dump("can't get parent directory\n"); }

  // if (parent) {
    // gotoDirectory(parent);
  // }
// }

// function goHome() {
  // gotoDirectory(homeDir);
// }

// function newDir() {
  // var file;
  // var promptService =
    // Components.classes[NS_PROMPTSERVICE_CONTRACTID].getService(Components.interfaces.nsIPromptService);
  // var dialogTitle =
    // gFilePickerBundle.getString("promptNewDirTitle");
  // var dialogMsg =
    // gFilePickerBundle.getString("promptNewDirMessage");
  // var ret = promptService.prompt(window, dialogTitle, dialogMsg, gNewDirName, null, {value:0});

  // if (ret) {
    // file = processPath(gNewDirName.value);
    // if (!file) {
      // showErrorDialog("errorCreateNewDirTitle",
                      // "errorCreateNewDirMessage",
                      // file);
      // return false;
    // }
    
    // file = file[0].QueryInterface(nsIFile);
    // if (file.exists()) {
      // showErrorDialog("errorNewDirDoesExistTitle",
                      // "errorNewDirDoesExistMessage",
                      // file);
      // return false;
    // }

    // var parent = file.parent;
    // if (!(parent.exists() && parent.isDirectory() && parent.isWritable())) {
      // var oldParent = parent;
      // while (!parent.exists()) {
        // oldParent = parent;
        // parent = parent.parent;
      // }
      // if (parent.isFile()) {
        // showErrorDialog("errorCreateNewDirTitle",
                        // "errorCreateNewDirIsFileMessage",
                        // parent);
        // return false;
      // }
      // if (!parent.isWritable()) {
        // showErrorDialog("errorCreateNewDirTitle",
                        // "errorCreateNewDirPermissionMessage",
                        // parent);
        // return false;
      // }
    // }

    // try {
      // file.create(nsIFile.DIRECTORY_TYPE, 0755); 
    // } catch (e) {
      // showErrorDialog("errorCreateNewDirTitle",
                      // "errorCreateNewDirMessage",
                      // file);
      // return false;
    // }
    // file.normalize(); // ... in case ".." was used in the path
    // gotoDirectory(file);
    // // we remember and reshow a dirname if something goes wrong
    // // so that errors can be corrected more easily. If all went well,
    // // reset the default value to blank
    // gNewDirName = { value: "" }; 
  // }
  // return true;
// }

// function gotoDirectory(directory) {
  // window.setCursor("wait");
  // try {
    // populateAncestorList(directory);
    // treeView.setDirectory(directory);
    // document.getElementById("errorShower").selectedIndex = 0;
  // } catch(ex) {
    // document.getElementById("errorShower").selectedIndex = 1;
  // }

  // window.setCursor("auto");

  // textInput.value = "";
  // textInput.focus();
  // textInput.setAttribute("autocompletesearchparam", directory.path);
  // sfile = directory;
// }

// // from the current directory and whatever was entered
// // in the entry field, try to make a new path. This
// // uses "/" as the directory separator, "~" as a shortcut
// // for the home directory (but only when seen at the start
// // of a path), and ".." to denote the parent directory.
// // returns an array of the files listed,
// // or false if an error occurred.

// function processPathEntry(path)
// {
  // var filePath;
  // var file;
  
  // var pD = ""; // path delimiter

  // try {
    // file = sfile.clone().QueryInterface(nsILocalFile);
  // } catch(e) {
    // dump("Couldn't clone\n"+e);
    // return false;
  // }
 
 // // Determine if we need Windows style path or unix style path
	// var temp_file = file.clone();
	// try {
		// temp_file.initWithPath("/");
		// pD = "/";
	// } catch (e) {
		// pD = "\\"
	// }

	// filePath = path;
	// if (pD == "/") {
	  // var tilde_file = file.clone();
	  // tilde_file.append("~");
	  // if (path[0] == '~' &&                        // Expand ~ to $HOME, except:
		  // !(path == "~" && tilde_file.exists()) && // If ~ was entered and such a file exists, don't expand
		  // (path.length == 1 || path[1] == "/"))    // We don't want to expand ~file to ${HOME}file
		// filePath = homeDir.path + path.substring(1);
	// }
	
  // // Unescape quotes
  // filePath = filePath.replace(/\\\"/g, "\"");
  
  // if (filePath[0] == '/' || filePath[3] == '\\')   /* an absolute path was entered */
    // file.initWithPath(filePath);
  // else if ((filePath.indexOf(pD + ".." + pD) > 0) ||
           // (filePath.substr(-3) == (pD + "..")) ||
           // (filePath.substr(0,3) == (".." + pD)) ||
           // (filePath == "..")) {
    // /* appendRelativePath doesn't allow .. */
    // try{
      // file.initWithPath(file.path + pD + filePath);
    // } catch (e) {
      // dump("Couldn't init path\n"+e);
      // return false;
    // }
  // }
  // else {
    // try {
      // file.appendRelativePath(filePath);
    // } catch (e) {
      // dump("Couldn't append path\n"+e);
      // return false;
    // }
  // }

  // return true;
// }
