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
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
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


function FileView()
{
    this._sortType = -1;
    this._totalRows = 0;
    this._showHiddenFiles = false;
    this._directoryFilter = false;
    this._reverseSort = false;
    
    this._fileList = [];
    this._dirList = [];
    this._filteredFiles = [];
	this._currentFilters = [];
}

// constants
FileView.sortName = 0;
FileView.sortSize = 1;
FileView.sortDate = 2;

FileView.prototype =
{
    QueryInterface: XPCOMUtils.generateQI([Ci.nsITreeView]),
    
    // nsIFileView
    
    get showHiddenFiles() { return this._showHiddenFiles; },
    
    set showHiddenFiles(showHidden)
    {
        if (showHidden != this._showHiddenFiles)
        {
            this._showHiddenFiles = showHidden;
            if (this._dir)
				this.setDirectory(this._dir);
        }
    },
    
    get showOnlyDirectories() { return this._directoryFilter; },
    
    set showOnlyDirectories(onlyDirs)
    {
        if (onlyDirs == this._directoryFilter)
            return;
        
        this._directoryFilter = onlyDirs;
        let dirCount = this._dirList.length;
        if (this._directoryFilter)
        {
            let rowDiff = this._totalRows - dirCount;
            //this.filteredFiles.length = 0;
            this._filteredFiles.length = 0;
            this._totalRows = dirCount;
            
            if (this._tree)
                this._tree.rowCountChanged(this._totalRows, -rowDiff);
        }
        else
        {
            this._filterFiles();
            this._sortArray(this._filteredFiles);
            
            if (this._reverseSort)
                this._filteredFiles.reverse();
            
            if (this._tree)
                this._tree.rowCountChanged(dirCount, this._totalRows - rowDiff);
        }
    },
    
    get sortType() { return this._sortType; },
    get reverseSort() { return this._reverseSort; },
    
    sort: function(sortType, reverseSort)
    {
        if (sortType == this._sortType)
        {
            if (reverseSort == this._reverseSort)
                return;
            
            this._reverseSort = reverseSort;
            this._dirList.reverse();
            this._filteredFiles.reverse();
        }
        else
        {
            this._sortType = sortType;
            this._reverseSort = reverseSort;
            this._sortInternal();
        }
        
        if (this._tree)
            this._tree.invalidate();
    },
    
    setDirectory: function(directory)
    {
        let dirEntries = directory.directoryEntries;
        
        this._directoryPath = directory;
        this._fileList.length = 0;
        this._dirList.length = 0;
        
        while (dirEntries.hasMoreElements())
        {
            let next = dirEntries.getNext().QueryInterface(Ci.nsIFile);
            
            if (next.isDirectory())
            {
                let hidden = (next.isHidden() || (next.leafName.charAt(0) == "."));
                if (this._showHiddenFiles || (! hidden))
                    this._dirList.push(next);
            }
            else
            {
                this._fileList.push(next);
            }
        }
        
        if (this._tree)
        {
            this._tree.beginUpdateBatch();
            this._tree.rowCountChanged(0, -this._totalRows);
        }
        
        this._filterFiles();
        this._sortInternal();
        
        if (this._tree)
        {
            this._tree.endUpdateBatch();
            this._tree.scrollToRow(0);
        }
    },
    
    setFilter: function(filterString)
    {
        this._currentFilters = filterString.split(/[ ;]+/);
        
        if (this._tree)
        {
            this._tree.beginUpdateBatch();
            let count = this._dirList.length;
            this._tree.rowCountChanged(count, count - this._totalRows);
        }
        
        this._filteredFiles.length = 0;
        
        this._filterFiles();
        this._sortArray(this._filteredFiles);
        
        if (this._reverseSort)
            this._filteredFiles.reverse();
        
        if (this._tree)
            this._tree.endUpdateBatch();
    },
    
    get selectedFiles()
    {
        if (this.selection.count == 0)
            return [];
        
        let numRanges = this.selection.getRangeCount();
        let dirCount = this._dirList.length;
        let fileArray = [];
        
        for (let range = 0; range < numRanges; range++)
        {
            let rangeBegin = {};
            let rangeEnd = {};
            this.selection.getRangeAt(range, rangeBegin, rangeEnd);
            
            for (let itemIndex = rangeBegin.value; itemIndex <= rangeEnd.value; itemIndex++)
            {
                let curFile;
                
                if (itemIndex < dirCount)
                    curFile = this._dirList[itemIndex];
                else if (itemIndex < this._totalRows)
                    curFile = this._filteredFiles[itemIndex - dirCount];
                
                if (curFile)
                    fileArray.push(curFile);
            }
        }
        
        return fileArray;
    },
    
    // nsITreeView
    
    get rowCount() { return this._totalRows; },
    
    getRowProperties: function(row, props) {},
    
    getCellProperties: function(row, col, props)
    {
        let dirCount = this._dirList.length;
        
        if (row < dirCount)
            props.AppendElement(ATOM_DIR);
        else if (row < this._totalRows)
            props.AppendElement(ATOM_FILE);
    },
    
    getColumnProperties: function(colid, col, props) {},
    
    isContainer: function(row) { return false; },
    
    isSeparator: function(row) { return false; },
    
    isSorted: function() { return (this._sortType >= 0); },
    
    getLevel: function(row) { return 0; },
    
    getImageSrc: function(row,col) { return null; },
    
    getCellText: function(row, col)
    {
        let dirCount = this._dirList.length;
        let fileCount = this._filteredFiles.length;
        
        let isDirectory;
        let curFile;
        
        if (row < dirCount)
        {
            isDirectory = true;
            curFile = this._dirList[row];
        }
        else if (row < this._totalRows)
        {
            isDirectory = false;
            curFile = this._filteredFiles[row - dirCount];
        }
        else
            return "";
        
        let colId = col.id;
        
        if (colId == "FilenameColumn")
            return curFile.leafName;
        else if (colId == "LastModifiedColumn")
        {
            let date = new Date(curFile.lastModifiedTime);
            return date.toLocaleDateString() + " " + date.toLocaleTimeString();
        }
        else
        {
            if (isDirectory)
                return "";
            else
                return curFile.fileSize
        }
    },
    
    setTree: function(treeBoxObject) { this._tree = treeBoxObject; },
    
    cycleHeader: function(col) {},
    
    // private methods
    
    _filterFiles: function()
    {
        let count = this._dirList.length;
        this._totalRows = count;
        count = this._fileList.length;
        this._filteredFiles.length = 0;
        let filterCount = this._currentFilters.length;
        
        for (let i = 0; i < count; i++)
        {
            let file = this._fileList[i];
            let isHidden = false;
            if (! this._showHiddenFiles)
                isHidden = (file.isHidden() || (file.leafName.charAt(0) == "."));
            
            let leafName = file.leafName;
            
            if (! isHidden)
            {
                for (let k = 0; k < filterCount; k++)
                {
                    let matched = false;
                    if (this._currentFilters[k] == "..apps")
                        matched = file.isExecutable();
                    else
                        matched = wildCardMatch(leafName, this._currentFilters[k]);
                    
                    if (matched)
                    {
                        this._filteredFiles.push(file);
                        this._totalRows++;
                        break;
                    }
                }
            }
        }
    },
    
    _sortNameCallback: function(element1, element2, context)
    {
        return element1.leafName.localeCompare(element2.leafName);
    },

    _sortSizeCallback: function(element1, element2)
    {
        return element1.fileSize - element2.fileSize;
    },
    
    _sortDateCallback: function(element1, element2)
    {
        return element1.lastModifiedTime - element2.lastModifiedTime;
    },
    
    _sortArray: function(array)
    {
        let compareFunc;
        
        switch (this._sortType)
        {
            case FileView.sortName:
                compareFunc = this._sortNameCallback;
                break;
            case FileView.sortSize:
                compareFunc = this._sortSizeCallback;
                break;
            case FileView.sortDate:
                compareFunc = this._sortDateCallback;
                break;
            default:
                return;
        }
        
        array.sort(compareFunc);
    },
    
    _sortInternal: function()
    {
        this._sortArray(this._dirList);
        this._sortArray(this._filteredFiles);
        
        if (this._reverseSort)
        {
            this._dirList.reverse();
            this._filteredFiles.reverse();
        }
    }
}


function wildCardMatch(s, glob)
{
    let pattern = "^" + glob.replace(".", "\.").replace("*", ".*") + "$";
    let re = new RegExp(pattern);
    return re.test(s);
}
