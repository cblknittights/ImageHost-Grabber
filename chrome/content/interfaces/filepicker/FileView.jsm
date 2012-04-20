// https://developer.mozilla.org/en/XPCOMUtils.jsm

/*
 * This is JavaScript port of nsFileView.
 * http://hg.mozilla.org/mozilla-central/file/e6cc9d708dbf/toolkit/components/filepicker/src/nsFileView.cpp
 *
 * Changes:
 *  - Treat dot-files as hidden files.
 */


const EXPORTED_SYMBOLS =
[
    "DirTreeView",
];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const atomSvc = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
const ATOM_DIR = atomSvc.getAtom("directory");
const nsILocalFile = Components.interfaces.nsILocalFile;
const ROOT_ELEMENT = "\\\\.";

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
    wrappedJSObject: this,
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
			if (path == ROOT_ELEMENT) this.init();
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
		this.top = this;
		this.getChildDirs();
		this.setIndices();
	},
	
	setIndices: function(startRow) {
		var maxIter = 10000, i = 0;
		
		if (startRow != null) {
			var row = startRow;
			var rows = this.rows.slice(0, startRow.rowIdx);
		}
		else {
			var row = this.firstRow;
			var rows = [];
		}

		while ( (i < maxIter) && (row != null) ) {
			i++;
			var rowIdx = rows.push(row) - 1;
			row.rowIdx = rowIdx;
			row = row.nextRow;
		}
	},
	
	getChildDirs: function() {
		if (!this.hasChildren) return null;
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

		return this.children = childs;
	}
}
	
/*
function FileView()
{
    this.sortType = -1;
    this.totalRows = 0;
    this.reverseSort = false;
	
	var dirElem = new DirTreeView("\\\\.");
}

FileView.prototype =
{
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsITreeView]),
    wrappedJSObject: this,
	
	dirTree: new DirTreeView(ROOT_ELEMENT),
	
    treeBox: null,
		
    get rowCount() { return this.dirTree.rowCount; },
    
	get selectedDirectory() { 
		var row = this.selection.currentIndex;
		if (row < this.rowCount) return this.dirList[row].directory;
	},
	
    getRowProperties: function(row, props) {},
    getColumnProperties: function(row, props) {},
    getCellProperties: function(row, col, props) { props.AppendElement(ATOM_DIR); },
    
    isContainer: function(row) { return this.dirList[row].hasChildren; },
    isContainerOpen: function(row) { return this.dirList[row].isExpanded; },  
    isContainerEmpty: function(row) { return false; },  
    isSeparator: function(row) { return false; },  
    
    isSorted: function() { return (this.sortType >= 0); },
    
    getImageSrc: function(row,col) { return null; },

    isEditable: function(row, column)  { return false; },
	
	getParentIndex: function(row) { return this.dirList[row].parentRowIdx; },
	
	getLevel: function(row) { return this.dirList[row].dirLevel; },
	
    hasNextSibling: function(row, after) { return this.dirList[row].isLastSibling; },
	
    toggleOpenState: function(row) {
		var item = this.dirList[row];
		if (!item.hasChildren) return;

		if (item.isExpanded) {  
			item.isExpanded = false;  
			var childs = item.getChildDirs();
			var start = childs[0].rowIdx;
			var len = childs.length;
			dump("start: " + start + " , len: " + len + " , row: " + row + "\n");
			this.delRows(start, len);
			this.treeBox.rowCountChanged(start, -len);
			// var thisLevel = item.dirLevel;  
			// var devarecount = 0;  
			// for (var t = row + 1; t < this.dirList.length; t++) {  
				// if (this.getLevel(t) > thisLevel) devarecount++;  
				// else break;  
			// }  
			// if (devarecount) {  
				// this.dirList.splice(row + 1, devarecount);  
				// this.treeBox.rowCountChanged(row + 1, -devarecount);  
			// }  
		}  
        else {  
			item.isExpanded = true;  
			var childs = item.getChildDirs();
			this.addRows(childs, row + 1);
			this.treeBox.rowCountChanged(row + 1, childs.length);
			// dump("dirList: \n" + this.dirList.toSource() + "\n");
			// dump("childs length: " + childs.length + "\n");
			// for (var i = 0; i < childs.length; i++) {
				// dump("child " + i + ": " + childs[i].leafName + "\n");
			// }
		}  
        this.treeBox.invalidateRow(row);  
      },  	  

	getCellText: function(row, col) {
		//dump("row: " + row + "\n");
		try { return this.dirList[row].leafName; }
		catch(e) { 
			//dump("error on row: " + row + "\n\n");
			}
	},
    
    setTree: function(treeBoxObject) { this.treeBox = treeBoxObject; }    
}


function wildCardMatch(s, glob)
{
    var pattern = "^" + glob.replace(".", "\.").replace("*", ".*") + "$";
    var re = new RegExp(pattern);
    return re.test(s);
}
*/