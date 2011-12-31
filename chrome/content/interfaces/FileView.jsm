/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Google Code Wiki Viewer.
 *
 * The Initial Developer of the Original Code is Atte Kemppilä.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Atte Kemppilä <atte.kemppila@iki.fi>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by devaring the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not devare
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


/*
 * This is JavaScript port of nsFileView.
 * http://hg.mozilla.org/mozilla-central/file/e6cc9d708dbf/toolkit/components/filepicker/src/nsFileView.cpp
 *
 * Changes:
 *  - Treat dot-files as hidden files.
 */


const EXPORTED_SYMBOLS =
[
    "FileView",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const atomSvc = Cc["@mozilla.org/atom-service;1"].getService(Ci.nsIAtomService);
    
const ATOM_DIR = atomSvc.getAtom("directory");

const nsILocalFile = Ci.nsILocalFile;
const NS_LOCAL_FILE = "@mozilla.org/file/local;1";

function DirElement(directory) {
	this._childDirs = [];
	this._directory = null;

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
		var next = dirEntries.getNext().QueryInterface(Ci.nsIFile);
		
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

DirElement.prototype = {
	/* properties for the current directory */
	get directory() { return this._directory; },
	set directory(path) { 
		if (path instanceof nsILocalFile) this._directory = path;
		else if (typeof(path) == "string" || path instanceof String) {
			this._directory = Cc[NS_LOCAL_FILE].createInstance(nsILocalFile);
			this._directory.initWithPath(path);
		}
		else throw("ImageHost Grabber: new DirElement needs either a string path or an nsILocalFile type passed at object creation");
	},
	get path() { return this._directory.path; },
	get leafName() { return this._directory.leafName; },
	
	/* properties for internal processing */
	get hasParent() { return this.parentDir != null; },
	get parentDir() { return this._directory.parent; },
	get hasChildren() { return this._childDirs.length > 0; },
	parentObj : null,
	childrenObjs : null,
	
	/* properties for nsITreeView */
	// parentIdx : -1,
	get parentIdx() {
		if (this.parentObj == null) return -1;
		else return this.parentObj.rowIdx;
	},
	rowIdx : -1,
	dirLevel : -1,
	isExpanded : false,
	hasNextSibling : true,
		
	/* permission properties */
	// get hidden() { return this._directory.isHidden(); },
	// get special() { return this._directory.isSpecial(); },
	// get readable() { return this._directory.isReadable(); },
	// get writable() { return this._directory.isWritable(); },
	readable : true,
	writable : true,
	
	/* error messages */
	errors : [],
	
	getDirLevel : function() {
		if (this.hasParent == null) this.getParentDir();
		
		if (this.hasParent == false) {
			this.dirLevel = -1;
			return;
		}
		
		if (this._directory.path.match(/.\:$/)) {
			this.dirLevel = 0;
			return
		}
		
		var pDir = this.parentDir;
		var dirLev = 0;
		
		while (pDir != null) {
			dirLev++;
			pDir = pDir.parent;
		}
		
		this.dirLevel = dirLev;
	},
		
	getChildDirs : function() {
		if (!this.hasChildren) return null;
		if (this.childrenObjs != null) return this.childrenObjs;
		
		var childs = [];
		
		for (var i = 0; i < this._childDirs.length; i++) {
			var dElem = new DirElement(this._childDirs[i]);
			dElem.parentObj = this;
			dElem.dirLevel = this.dirLevel + 1;
			childs.push(dElem);
		}
		
		childs[childs.length-1].hasNextSibling = false;
		
		return this.childrenObjs = childs;
		//return childs;
	}
}
	

function FileView()
{
    this.sortType = -1;
    this.totalRows = 0;
    this.reverseSort = false;
	
	var dirElem = new DirElement("\\\\.");
	var childs = dirElem.getChildDirs();
	
	this.addRows(childs, 0);
}

// constants
FileView.sortName = 0;
FileView.sortSize = 1;
FileView.sortDate = 2;

FileView.prototype =
{
    QueryInterface: XPCOMUtils.generateQI([Ci.nsITreeView]),
    
	dirList: [],
	
    treeBox: null,
	
	updateRowIndices: function() {
		for (var i = 0; i < this.dirList.length; i++) this.dirList[i].rowIdx = i;
	},
	
	addRows: function(rows, idx) {
		for (var i = 0; i < rows.length; i++) this.dirList.splice(idx + i, 0, rows[i]);
		this.updateRowIndices();
	},
	
	delRows: function(start, len) {
		for (var i = 0; i < this.dirList.length; i++) {
			dump("Before\nleafName: " + this.dirList[i].leafName + ", rowIdx: " + this.dirList[i].rowIdx +
			     ", parentIdx: " + this.dirList[i].parentIdx + ", dirLevel: " + this.dirList[i].dirLevel +
				 ", hasNextSibling: " + this.dirList[i].hasNextSibling + "\n");
		}
		this.dirList.splice(start, len);
		this.updateRowIndices();
		for (var i = 0; i < this.dirList.length; i++) {
			dump("After\nleafName: " + this.dirList[i].leafName + ", rowIdx: " + this.dirList[i].rowIdx +
			     ", parentIdx: " + this.dirList[i].parentIdx + ", dirLevel: " + this.dirList[i].dirLevel +
				 ", hasNextSibling: " + this.dirList[i].hasNextSibling + "\n");
		}
	},
	
    get rowCount() { return this.dirList.length; },
    
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
	
	getParentIndex: function(row) { return this.dirList[row].parentIdx; },
	
	getLevel: function(row) { return this.dirList[row].dirLevel; },
	
    hasNextSibling: function(row, after) { return this.dirList[row].hasNextSibling; },
	
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
		catch(e) { /*dump("error on row: " + row + "\n\n");*/ }
	},
    
    setTree: function(treeBoxObject) { this.treeBox = treeBoxObject; }    
}


function wildCardMatch(s, glob)
{
    var pattern = "^" + glob.replace(".", "\.").replace("*", ".*") + "$";
    var re = new RegExp(pattern);
    return re.test(s);
}
