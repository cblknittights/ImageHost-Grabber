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
const ATOM_FILE = atomSvc.getAtom("file");

const nsILocalFile = Ci.nsILocalFile;
const NS_LOCAL_FILE = "@mozilla.org/file/local;1";

function DirElement(directory) {
	if (directory != null) {
		if (typeof(directory) == "string") this.directory = directory;
		else this.currentDirectory = directory;
	}
}
DirElement.prototype = {
	currentDirectory : Cc[NS_LOCAL_FILE].createInstance(nsILocalFile),
	
	get directory() { return this.currentDirectory.leafName; },
	set directory(path) { this.currentDirectory.initWithPath(path); },
	
	siblingDirs : [],
	hasSiblings : null,
	hasNextSibling : null,

	dirLevel : -1,

	hasParent : null,
	parentDir : null,
	parentIdx : -1,
		
	hasChildren : null,
	childDirs : [],

	isExpanded : null,
	
	populate : function() {
		this.isExpanded = false;
		
		this.getParentDir();
		this.getDirLevel();
		this.getSiblingDirs();
		this.getChildDirs();
	},
	
	getParentDir : function() {
		this.hasParent = false;
		
		this.parentDir = this.currentDirectory.parent;
		if (this.parentDir == null) {
			if (this.currentDirectory.path.match(/.\:$/)) {
				this.hasParent = true;
				this.parentDir = Cc[NS_LOCAL_FILE].createInstance(nsILocalFile);
				this.parentDir.initWithPath("\\\\.");
			}
			else this.parentDir = null;
		}
		else this.hasParent = true;
	},
	
	getDirLevel : function() {
		if (this.hasParent == false) {
			this.dirLevel = -1;
			return;
		}
		if (this.currentDirectory.path.match(/.\:$/)) {
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
	
	getSiblingDirs : function() {
		this.siblingDirs = [];
		this.hasSiblings = false;
		this.hasNextSibling = false;
		
		if (this.hasParent == false) return;
		
		var dirEntries = this.parentDir.directoryEntries;
		
		while (dirEntries.hasMoreElements()) {
			var next = dirEntries.getNext().QueryInterface(Ci.nsIFile);
			try {
				if (next.isDirectory()) {
					if (!this.hasSiblings) this.hasSiblings = true;
					if (!this.hasNextSibling) this.hasNextSibling = true;

					if (this.currentDirectory.equals(next)) this.siblingDirs.push(this) - 1;
					else {
						var temp = new DirElement(next);
						this.siblingDirs.push(temp);
					}
				}
			}
			catch (e) {
				if (e.name == "NS_ERROR_FILE_NOT_FOUND") continue;
				else throw(e);
			}
		}
		var lastIdx = this.siblingDirs.length - 1;
		this.siblingDirs[lastIdx].hasNextSibling = false;
	},
	
	getChildDirs : function() {
		this.childDirs = [];
		var dirEntries = this.currentDirectory.directoryEntries;
		
		this.hasChildren = false;
		
		while (dirEntries.hasMoreElements()) {
			
			var next = dirEntries.getNext().QueryInterface(Ci.nsIFile);
			try {
				if (next.isDirectory()) {
					if (!this.hasChildren) this.hasChildren = true;
					this.childDirs.push(new DirElement(next));
				}
			}
			catch(e) {
				if (e.name == "NS_ERROR_FILE_NOT_FOUND") continue;
				else throw(e);
			}
		}
	}
}
	

function FileView()
{
    this.sortType = -1;
    this.totalRows = 0;
    this.reverseSort = false;
    
	var dirElem = new DirElement("\\\\.");
	dirElem.populate();
	
    this.dirList = [];
	
	for (var i = 0; i < dirElem.childDirs.length; i++) {
		try {
			dirElem.childDirs[i].populate();
		}
		catch (e) {
			if (e.name == "NS_ERROR_FILE_ACCESS_DENIED") {
				continue;
			}
			else throw(e);
		}
		dirElem.childDirs[i].parentIdx = -1;
		this.dirList.push(dirElem.childDirs[i]);
	}	
}

// constants
FileView.sortName = 0;
FileView.sortSize = 1;
FileView.sortDate = 2;

FileView.prototype =
{
    QueryInterface: XPCOMUtils.generateQI([Ci.nsITreeView]),
    
    // nsIFileView
        
    treeBox: null,  
	
    setDirectory: function(path) {
        var dirElem = new DirElement(path);
		dirElem.populate();	
		this.dirList.push(dirElem);
        
        // if (this.treeBox)
        // {
            // this.treeBox.beginUpdateBatch();
            // this.treeBox.rowCountChanged(0, -this._totalRows);
        // }
		// // sort directories maybe?
        // if (this.treeBox)
        // {
            // this.treeBox.endUpdateBatch();
            // this.treeBox.scrollToRow(0);
        // }
    },
    
    // nsITreeView
	
    get rowCount() { return this.dirList.length; },
    
	get selectedDirectory() { return this.dirList[this.selection.currentIndex].currentDirectory; },
	
    getRowProperties: function(row, props) {},
    getColumnProperties: function(row, props) {},
    
    getCellProperties: function(row, col, props) {
        var dirCount = this.dirList.length;
        
        if (row < dirCount) props.AppendElement(ATOM_DIR);
    },
    
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

			var thisLevel = item.dirLevel;  
			var devarecount = 0;  
			for (var t = row + 1; t < this.dirList.length; t++) {  
				if (this.getLevel(t) > thisLevel) devarecount++;  
				else break;  
			}  
			if (devarecount) {  
				this.dirList.splice(row + 1, devarecount);  
				this.treeBox.rowCountChanged(row + 1, -devarecount);  
			}  
		}  
        else {  
			item.isExpanded = true;  

			var label = item.directory;  
			var toinsert = item.childDirs;  
			for (var i = 0; i < toinsert.length; i++) {
				try { toinsert[i].populate(); }
				catch (e) {
					if (e.name == "NS_ERROR_FILE_ACCESS_DENIED") continue;
					else throw(e);
				}
				toinsert[i].parentIdx = row;
				this.dirList.splice(row + i + 1, 0, toinsert[i]);  
			}  
			this.treeBox.rowCountChanged(row + 1, toinsert.length);  
			}  
        this.treeBox.invalidateRow(row);  
      },  	  

	getCellText: function(row, col) { try { return this.dirList[row].directory } catch(e) { dump("row: " + row + " , dirList: " + this.dirList.toSource() + "\n\n"); } },
    
    setTree: function(treeBoxObject) { this.treeBox = treeBoxObject; }    
}


function wildCardMatch(s, glob)
{
    var pattern = "^" + glob.replace(".", "\.").replace("*", ".*") + "$";
    var re = new RegExp(pattern);
    return re.test(s);
}
