const nsILocalFile = Components.interfaces.nsILocalFile;
const nsIFile = Components.interfaces.nsIFile;
const nsIFilePicker = Components.interfaces.nsIFilePicker;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://imagegrabber/Utils.jsm");
Components.utils.import("resource://imagegrabber/DirTreeView.jsm");

function FilePicker() {
	this.retvals = null;
	this.allowURLs = null;
	
	this.homeDir = null;
	
	this.fnameChildren = null;
	this.textInput = null;
	this.okButton = null;
	this.gFilePickerBundle = null;
	
	this.treeView = null;
	this.tree = null;
	this.TreeList = [];
	this.TreeDict = {};
	
	// name of new directory entered by the user to be remembered
	// for next call of newDir() in case something goes wrong with creation
	this.gNewDirName = {
		value : ""
	};
}

FilePicker.prototype = {
	filepickerLoad : function filepickerLoad() {
		this.gFilePickerBundle = document.getElementById("bundle_filepicker");
		
		this.textInput = document.getElementById("textInput");
		this.okButton = document.documentElement.getButton("accept");
		this.fnameChildren = document.getElementById("FilenameChildren");
		
		var directory = null;
		var title = null;
		if (window.arguments == null) {
			this.retvals = {};
			title = "Select a directory";
			this.allowURLs = true;
		} else {
			var o = window.arguments[0].wrappedJSObject;
			this.retvals = o.retvals;
			title = o.title;
			directory = o.displayDirectory;
			this.allowURLs = o.allowURLs;
		}
		
		this.treeView = new DirTreeView(this.TreeList, this.TreeDict);
		document.title = title;
		
		var textInputLabel = document.getElementById("textInputLabel");
		textInputLabel.value = this.gFilePickerBundle.getString("dirTextInputLabel");
		textInputLabel.accessKey = this.gFilePickerBundle.getString("dirTextInputAccesskey");
		
		// setup the dialogOverlay.xul button handlers
		this.retvals.buttonStatus = nsIFilePicker.returnCancel;
		
		this.tree = document.getElementById("directoryTree");
		this.tree.treeBoxObject.view = this.treeView;
		
		this.setHomeDir();
		
		if (directory != null)
			this.treeView.gotoDirectory(directory);
	},
	
	setHomeDir : function getHomeDir() {
		var dirService = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties);
		this.homeDir = dirService.get("ProfD", nsIFile);
	},
	
	selectOnOK : function selectOnOK() {
		var selectedIdx = this.SelectedIndex;
		var selectedItem = this.SelectedTreeItem;
		
		if (this.textInput.value != this.SelectedDirectory)
			return fp.getDirFromTF();
		
		if (selectedIdx == -1)
			return false;
		
		if (this.SelectedTreeItem.IsWritable != true) {
			alert("Selected directory \"" + this.SelectedDirectory + "\" is not writable.");
			return false;
		}
		
		this.retvals.directory = this.SelectedDirectory;
		this.retvals.buttonStatus = nsIFilePicker.returnOK;
		
		return true;
	},
	
	getDirFromTF : function getDirFromTF() {
		var dirPath = this.textInput.value;

		var nsDir = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile)
		nsDir.initWithPath(dirPath);
		var doesExist = nsDir.exists();
		
		if (doesExist == true) {
			this.retvals.directory = nsDir.path;
		} else {
			var doCreate = confirm("The directory \"" + nsDir.path + "\" does not exist. Create?");
			if (doCreate == true) {
				nsDir.create(1, 0666);
				this.retvals.directory = nsDir.path;
			} else
				return false;
		}
		
		return true;	
	},
	
	onCancel : function onCancel() {
		// Close the window.
		this.retvals.buttonStatus = nsIFilePicker.returnCancel;
		return true;
	},
	
	onSelect : function onSelect(event) {
		if (this.SelectedIndex == -1) {
			this.textInput.value = "";
			return;
		}
		
		var miRename = document.getElementById("miRename");
		var miDelete = document.getElementById("miDelete");
		
		if (this.SelectedTreeItem.ContainerLevel == 0) {
			miRename.disabled = true;
			miDelete.disabled = true;
		} else {
			miRename.disabled = false;
			miDelete.disabled = false;
		}
		
		this.textInput.value = this.SelectedDirectory;
	},
	
	get SelectedIndex() {
		var selectedIndex = this.tree.view.selection.currentIndex;
		return selectedIndex;
	},
	
	get SelectedDirectory() {
		var selectedIndex = this.tree.view.selection.currentIndex;
		if (selectedIndex < 0)
			return null;
		
		var selectedDir = this.TreeList[selectedIndex].Directory.Path;
		return selectedDir;
	},
	
	get SelectedTreeItem() {
		var selectedIndex = this.tree.view.selection.currentIndex;
		if (selectedIndex < 0)
			return null;
		
		var selectedItem = this.TreeList[selectedIndex];
		return selectedItem;
	},
	
	goHome : function goHome() {
		this.treeView.gotoDirectory(this.homeDir);
	},
	
	newDir : function newDir() {
		if (this.SelectedIndex == -1)
			return;
		
		var selectedDir = this.SelectedDirectory;
		var selectedIdx = this.SelectedIndex;
		var selectedItem = this.SelectedTreeItem;
		
		if (selectedItem.IsWritable == false) {
			promptSvc.alert("You do not have permission to write to \"" + selectedItem.DisplayText + "\"", "Access Denied");
			return;
		}
		
		var dir = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
		dir.initWithPath(selectedDir);
		
		dir.append("New folder");
		// dir.createUnique(nsILocalFile.DIRECTORY_TYPE, 0666);
		
		var i = 2;
		while (dir.exists() == true) {
			dir.leafName = "New folder (" + i + ")";
			i++;
		}
		
		dir.create(nsILocalFile.DIRECTORY_TYPE, 0666);
		
		this.treeView.RefreshList(selectedIdx);
		this.treeView.gotoDirectory(dir.path);
		
		this.editCell();
	},
	
	editCell : function editCell() {
		if (this.SelectedIndex == -1 || this.SelectedTreeItem.ContainerLevel == 0)
			return;
		
		if (this.SelectedTreeItem.IsWritable == false) {
			promptSvc.alert("You do not have permission to rename \"" + this.SelectedTreeItem.DisplayText + "\"", "Access Denied");
			return;
		}
		
		this.tree.editable = true;
		this.tree.startEditing(this.SelectedIndex, this.tree.columns[0]);
		this.tree.editable = false;
	},
	
	delDir : function delDir() {
		if (this.SelectedIndex == -1 || this.SelectedTreeItem.ContainerLevel == 0)
			return;
		
		var selectedDir = this.SelectedDirectory;
		var selectedIdx = this.SelectedIndex;
		var selectedItem = this.SelectedTreeItem;
		
		if (selectedItem.IsWritable == false) {
			promptSvc.alert("You do not have permission to delete \"" + selectedItem.DisplayText + "\"", "Access Denied");
			return;
		}
		
		var doDelete = confirm("You are about to delete \"" + selectedItem.DisplayText + "\" and all of it's contents. Continue?");
		if (doDelete != true)
			return;
		
		var dir = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
		dir.initWithPath(selectedDir);
		
		dir.remove(true);
		
		this.treeView.RefreshList(selectedItem.ParentContainerIndex);
	}
	
	// from the current directory and whatever was entered
	// in the entry field, try to make a new path. This
	// uses "/" as the directory separator, "~" as a shortcut
	// for the home directory (but only when seen at the start
	// of a path), and ".." to denote the parent directory.
	// returns an array of the files listed,
	// or false if an error occurred.
	
	// processPathEntry : function processPathEntry(refpath, relpath) {
	// var refdir = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile).initWithPath(refpath);
	
	// var pD = Directory.PATH_DELIM;
	
	// if (pD == "/") {
	// var tilde_file = refdir.clone();
	// tilde_file.append("~");
	// if (refpath[0] == '~' && // Expand ~ to $HOME, except:
	// !(refpath == "~" && tilde_file.exists()) && // If ~ was entered and such a file exists, don't expand
	// (refpath.length == 1 || refpath[1] == "/")) // We don't want to expand ~file to ${HOME}file
	// relpath = this.homeDir.path + refpath.substring(1);
	// }
	
	// // Unescape quotes
	// relpath = relpath.replace(/\\\"/g, "\"");
	
	// if (relpath[0] == '/' || relpath[3] == '\\') {
	// /* an absolute path was entered */
	// refdir.initWithPath(relpath);
	// return refdir;
	// } else if ((relpath.indexOf(pD + ".." + pD) > 0) ||
	// (relpath.substr(-3) == (pD + "..")) ||
	// (relpath.substr(0, 3) == (".." + pD)) ||
	// (relpath == "..")) {
	// /* appendRelativePath doesn't allow .. */
	// try {
	// refdir.initWithPath(refdir.path + pD + relpath);
	// } catch (e) {
	// dump("Couldn't init path\n" + e);
	// return false;
	// }
	// } else {
	// try {
	// refdir.appendRelativePath(relpath);
	// } catch (e) {
	// dump("Couldn't append path\n" + e);
	// return false;
	// }
	// }
	
	// return refdir;
	// }
}
