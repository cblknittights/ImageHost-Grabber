const EXPORTED_SYMBOLS =
	[
	"DirTreeView",
	"Directory",
	"Container"
];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://imagegrabber/Utils.jsm");

const nsILocalFile = Components.interfaces.nsILocalFile;

const ICO_CD_DRIVE = "chrome://imagegrabber/skin/images/cd_drive.ico";
const ICO_HARD_DRIVE = "chrome://imagegrabber/skin/images/hard_drive.ico";
const ICO_FOLDER = "chrome://imagegrabber/skin/images/folder.ico";

var TreeList = [];
var TreeDict = {};

function Directory(path) {
	// directory as string path or as nsILocalFile initiated with path
	this._nsILFChildren = null;
	this._children = null;
	this._nsILFDirectory = null;
	
	this._errors = [];
	
	this._isReadable = null;
	this._isWritable = null;
	
	this.nsILFDirectory = path;
}

const FILE_LOCKED = "NS_ERROR_FILE_IS_LOCKED";
const ACCESS_DENIED = "NS_ERROR_FILE_ACCESS_DENIED";

Directory.prototype = {
	/* properties for the current directory */
	get nsILFDirectory() {
		return this._nsILFDirectory;
	},
	set nsILFDirectory(path) {
		if (path instanceof nsILocalFile)
			this._nsILFDirectory = path;
		else if (typeof(path) == "string" || path instanceof String) {
			var localDirectory = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
			localDirectory.initWithPath(path);
			this._nsILFDirectory = localDirectory;
		}
	},
	
	get IsReadable() {
		try {
			var x = this._nsILFDirectory.directoryEntries;
			this._isReadable = true;
		} catch (e) {
			this._isReadable = false;
			
			var bitMask = e.name == FILE_LOCKED;
			bitMask |= e.name == ACCESS_DENIED;
			
			// If the error is anything other then the above, list the error
			if (bitMask == 0)
				this._errors.push(e.name);
		}
		
		return this._isReadable;
	},
	
	get IsWritable() {
		try {
			var dir = this._nsILFDirectory.clone()
			dir.append("test");
			dir.createUnique(nsILocalFile.NORMAL_FILE_TYPE,0666);
			dir.remove(false);
			this._isWritable = true;
		} catch (e) {
			this._isWritable = false;

			var bitMask = e.name == FILE_LOCKED;
			bitMask |= e.name == ACCESS_DENIED;
			
			// If the error is anything other then the above, list the error
			if (bitMask == 0)
				this._errors.push(e.name);
		}
		
		return this._isWritable;
	},
	
	get_nsILFChildren : function get_nsILFChildren() {
		this._nsILFChildren = [];
		this._errors = [];
		
		if (this.IsReadable == false)
			return;
			
		var dirEntries = this._nsILFDirectory.directoryEntries;
		
		while (dirEntries.hasMoreElements()) {
			var next = dirEntries.getNext().QueryInterface(Components.interfaces.nsIFile);
			
			try {
				var isDir = next.isDirectory();
			} catch (e) {
				continue;
			}
			if (isDir)
				this._nsILFChildren.push(next);
		}
	},
	
	get nsILFChildren() {
		this.get_nsILFChildren();
		
		return this._nsILFChildren;
	},
	
	get Path() {
		return this.nsILFDirectory.path;
	},
	get LeafName() {
		return this.nsILFDirectory.leafName;
	},
	
	get HasParentDir() {
		return this.ParentDir != null;
	},
	get ParentDir() {
		return this._nsILFDirectory.parent;
	},
	
	get HasErrors() {
		if (this._errors == null)
			this.get_nsILFChildren();
		
		return (this._errors.length > 0);
	},
	
	get Errors() {
		if (this._errors == null)
			return [];
		else
			return this._errors;
	},
	
	get HasChildren() {
		return this.nsILFChildren.length > 0;
	},
	
	get_Children : function get_Children() {
		this._children = [];
		var nsILFChildren = this.nsILFChildren;
		var count = nsILFChildren.length;
		
		for (var i = 0; i < count; i++) {
			var newDir = new Directory(nsILFChildren[i]);
			this._children.push(newDir);
		}
	},
	
	get Children() {
		if (this.HasChildren != true)
			return null;
		
		this.get_Children();
		
		return this._children;
	}
}

/* Directory "static" variables */
Directory.ROOT_ELEMENT = "";
Directory.PATH_DELIM = "";
Directory.DIRSEP_STYLE = "";

try {
	Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile).initWithPath("/");
	Directory.ROOT_ELEMENT = "/";
	Directory.PATH_DELIM = "/";
	Directory.DIRSEP_STYLE = "Unix"
} catch (e) {
	Directory.ROOT_ELEMENT = "\\\\.";
	Directory.PATH_DELIM = "\\";
	Directory.DIRSEP_STYLE = "Windows"
}

function Container(directory) {
	this.Directory = directory;
	
	this.IsContainer = true;
	this.IconFile = ICO_FOLDER;
	
	/* Properties for internal processing */
	this.ParentContainer = null;
	this.NextSiblingContainer = null;
	this.PrevSiblingContainer = null;
	this._children = null;
	this._isContainerOpen = false;
}

Container.prototype = {
	Clone : function Clone() {
		var x = new Container(this.Directory);
		x.IsContainer = this.IsContainer;
		x.IconFile = this.IconFile;
		x._isContainerOpen = this._isContainerOpen;
		x._children = this.Children;
		
		return x;
	},
	
	get HasNextSiblingContainer() {
		return this.NextSiblingContainer != null;
	},
	
	get DescandentCount() {
		var idx = this.ListIndex;
		var nextIdx = idx;
		
		var lev = this.ContainerLevel;
		var isDescandentLevel = true;
		while (isDescandentLevel == true) {
			if ((nextIdx + 1) >= TreeList.length) {
				isDescandentLevel = false;
			} else {
				isDescandentLevel = (lev < TreeList[nextIdx + 1].ContainerLevel);
			}
			nextIdx++;
		}
		
		// printLine("idx, nextIdx is : " + idx + ", " + nextIdx);
		return nextIdx - idx - 1;
	},
	
	get IsContainerEmpty() {
		return !this.Directory.HasChildren;
	},
	
	get DisplayText() {
		return this.Directory.LeafName;
	},
	
	get ContainerLevel() {
		if (this.ParentContainer == null)
			return 0;
		else
			return this.ParentContainer.ContainerLevel + 1;
	},
	
	get ParentContainerIndex() {
		if (this.ParentContainer == null)
			return -1;
		else
			return this.ParentContainer.ListIndex;
	},
	
	get IsReadable() {
		return this.Directory.IsReadable;
	},
	
	get IsWritable() {
		return this.Directory.IsWritable;
	},
	
	get HasErrors() {
		return this.Directory.HasErrors;
	},
	
	get Errors() {
		var errs = this.Directory.Errors;
		var temp = {};
		var retVal = [];
		
		var count = 0;
		if (errs.length > 0) {
			temp[errs[0]] = errs[0];
			retVal.push(errs[0]);
			count++;
		}
		
		for (var i = 1; i < errs.length; i++) {
			if (temp[errs[i]] == null) {
				temp[errs[i]] = errs[i];
				retVal.push(errs[i]);
				count++;
			}
		}
		
		return retVal.join("\n");
	},
	
	get_Children : function get_Children() {
		var tempChildren = [];
		var dirChildren = this.Directory.Children;
		var count = dirChildren.length;
		
		for (var i = 0; i < count; i++) {
			var childDir = dirChildren[i];
			var origContainer = this[childDir.LeafName.toLowerCase()];
			if (origContainer != null)
				var newContainer = origContainer;
			else
				var newContainer = new Container(childDir);
			if (Directory.DIRSEP_STYLE == "Windows")
				this[newContainer.DisplayText.toLowerCase()] = newContainer;
			else
				this[newContainer.DisplayText] = newContainer;
			
			newContainer.ParentContainer = this;
			tempChildren.push(newContainer);
		}
		
		for (var i = 1; i < count; i++) {
			tempChildren[i - 1].NextSiblingContainer = tempChildren[i];
			tempChildren[i].PrevSiblingContainer = tempChildren[i - 1];
		}
		
		this._children = tempChildren;
	},
	
	get Children() {
		this.get_Children();
		
		return this._children;
	},
	
	get ListIndex() {
		return TreeList.indexOf(this);
	},
	
	showChildren : function showChildren() {
		var idxStart = this.ListIndex + 1;
		var insertIdx = idxStart;
		
		var children = this.Children;
		
		var count = children.length;
		
		for (var i = 0; i < count; i++) {
			var child = children[i];
			
			// printLine("insertIdx of " + insertIdx + " for container \"" + this.DisplayText + "\" and child #" + i + " (" + child.DisplayText + ")");
			TreeList.splice(insertIdx, 0, child);
			if (child.IsContainerOpen == true) {
				child.showChildren();
				insertIdx += child.DescandentCount;
			}
			insertIdx += 1;
		}
	},
	
	hideChildren : function hideChildren() {
		var idxStart = this.ListIndex + 1;
		var count = this.DescandentCount;
		
		TreeList.splice(idxStart, count);
	},
	
	get IsContainerOpen() {
		return this._isContainerOpen;
	},
	set IsContainerOpen(value) {
		if (this.IsContainerEmpty == true)
			return;
		
		if (value == true) {
			if (this._isContainerOpen == true)
				return;
			this.showChildren();
		} else {
			if (this._isContainerOpen == false)
				return;
			this.hideChildren();
		}
		
		this._isContainerOpen = value;
	}
}

function DirTreeView(treeList, treeDict) {
	TreeList = treeList;
	TreeDict = treeDict;
	
	this.getLocalDrives();
}

DirTreeView.prototype = {
	getLocalDrives : function getLocalDrives() {
		var root = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
		root.initWithPath(Directory.ROOT_ELEMENT);
		
		// Untested code for Unix style paths
		if (Directory.DIRSEP_STYLE == "Unix") {
			var newContainer = new Container(root);
			TreeDict[newContainer.DisplayText] = newContainer;
			TreeList.push(newContainer);
			return;
		}
		
		var drivesEnum = root.directoryEntries;
		while (drivesEnum.hasMoreElements()) {
			var next = drivesEnum.getNext().QueryInterface(nsILocalFile);
			var newContainer = new Container(new Directory(next.path));
			
			if (newContainer.IsReadable == false)
				newContainer.IconFile = ICO_CD_DRIVE;
			else
				newContainer.IconFile = ICO_HARD_DRIVE;
			
			TreeDict[newContainer.DisplayText.toLowerCase()] = newContainer;
			TreeList.push(newContainer);
		}
	},
	
	gotoDirectory : function gotoDirectory(path) {
		var sfile = Components.classes["@mozilla.org/file/local;1"].createInstance(nsILocalFile);
		sfile.initWithPath(path);
		
		var paths = [];
		if (Directory.DIRSEP_STYLE = "Windows")
			paths.push(sfile.leafName.toLowerCase());
		else
			paths.push(sfile.leafName);
		
		var parentDir = sfile.parent;
		while (parentDir != null) {
			if (Directory.DIRSEP_STYLE = "Windows")
				paths.splice(0, 0, parentDir.leafName.toLowerCase());
			else
				paths.splice(0, 0, parentDir.leafName);
			
			parentDir = parentDir.parent;
		}
		
		try {
			var child = TreeDict[paths[0]];
			for (var i = 1; i < paths.length; i++) {
				if (!child.IsContainerOpen)
					this.toggleOpenState(child.ListIndex);
				
				child = child[paths[i]];
			}
			
			if (!child.IsContainerOpen)
				this.toggleOpenState(child.ListIndex);
			
			this.treeBox.scrollToRow(child.ListIndex);
			this.treeBox.view.selection.select(-1);
			this.treeBox.view.selection.select(child.ListIndex);
			this.scrollToMiddle();
		} catch (e) {
			this.treeBox.scrollToRow(0);
			this.treeBox.view.selection.select(0);
		}
	},
	
	scrollToMiddle : function scrollToMiddle() {
		var firstRow = this.treeBox.getFirstVisibleRow();
		var lastRow = this.treeBox.getLastVisibleRow();
		var scrollLength = parseInt((lastRow - firstRow) / 2);
		this.treeBox.scrollByLines(-scrollLength);
	},
	
	RefreshList : function RefreshList(idx) {
		var before = TreeList.length;
		
		var child = TreeList[idx];
		if (child.IsContainerOpen == true) {
			child.hideChildren();
			child.showChildren();
		}
		
		var count = TreeList.length - before;
		this.treeBox.rowCountChanged(idx + 1, count);
		this.treeBox.invalidateRow(idx);
		// this.treeBox.invalidateRange(idx, idx+child.DescandentCount);
	},
	
	/* nsITreeView Implementation */
	QueryInterface : XPCOMUtils.generateQI([Components.interfaces.nsITreeView]),
	
	treeBox : null,
	selection : null,
	
	get rowCount() {
		return TreeList.length;
	},
	setTree : function (treeBox) {
		this.treeBox = treeBox;
	},
	getCellText : function (idx, column) {
		return TreeList[idx].DisplayText;
	},
	isContainer : function (idx) {
		return TreeList[idx].IsContainer;
	},
	isContainerOpen : function (idx) {
		return TreeList[idx].IsContainerOpen;
	},
	isContainerEmpty : function (idx) {
		return TreeList[idx].IsContainerEmpty;
	},
	isSeparator : function (idx) {
		return false;
	},
	isSorted : function () {
		return false;
	},
	isEditable : function (idx, column) {
		return true;
	},
	setCellText : function (idx, column, value) {
		var currentContainer = TreeList[idx];
		var parentContainer = currentContainer.ParentContainer;
		var parentIndex = parentContainer.ListIndex;
		
		var oldDir = currentContainer.Directory.nsILFDirectory;
		var newDir = oldDir.clone();
		newDir.leafName = value;
		
		if (newDir.exists() == true) {
			promptSvc.alert("Directory \"" + value + "\" already exists in \"" + parentContainer.DisplayText + "\".", "Error");
			return;
		}
		
		oldDir.moveTo(oldDir.parent, value);
	
		this.RefreshList(parentIndex);
		
		this.gotoDirectory(newDir.path);
	},
	getParentIndex : function (idx) {
		return TreeList[idx].ParentContainerIndex;
	},
	
	getLevel : function (idx) {
		return TreeList[idx].ContainerLevel;
	},
	hasNextSibling : function (idx, after) {
		return TreeList[idx].HasNextSiblingContainer;
	},
	toggleOpenState : function (idx) {
		var item = TreeList[idx];
		
		if (item.IsReadable == false) {
			if (item.HasErrors == true)
				promptSvc.alert("Can not access directory \"" + item.DisplayText + "\"\n" + item.Errors, "Access Error");
			else
				promptSvc.alert("You do not have permission to access \"" + item.DisplayText + "\"" , "Access Denied");
			return;
		}

		if (item.IsContainerEmpty)
			return;
		
		if (item.IsContainerOpen == true) {
			var before = TreeList.length;
			
			item.IsContainerOpen = false;
			
			var count = TreeList.length - before;
			this.treeBox.rowCountChanged(idx + 1, count);
		} else {
			var before = TreeList.length;
			
			item.IsContainerOpen = true;
			
			var count = TreeList.length - before;
			
			this.treeBox.rowCountChanged(idx + 1, count);
		}
		
		this.treeBox.invalidateRow(idx);
	},
	
	getImageSrc : function (idx, column) {
		return TreeList[idx].IconFile;
	},
	getProgressMode : function (idx, column) {},
	getCellValue : function (idx, column) {},
	cycleHeader : function (col, elem) {},
	selectionChanged : function () {},
	cycleCell : function (idx, column) {},
	performAction : function (action) {},
	performActionOnRow : function (action, row) {},
	performActionOnCell : function (action, index, column) {},
	getRowProperties : function (idx, prop) {},
	getCellProperties : function (row, col, props) {},
	getColumnProperties : function (column, element, prop) {}
}
