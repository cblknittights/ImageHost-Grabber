var objLinks;
var firstPage; 
var lastPage;
var params = window.arguments[0];


function onUnLoad() {
	with (document.getElementById("rowHeightVal"))
		setAttribute("saved", value);
}

function onLoad() {
	with (document.getElementById("rowHeightVal"))
		value = getAttribute("saved");
		
	objLinks = params.inn.links;
	firstPage = params.inn.firstPage;
	lastPage = params.inn.lastPage;
	
	var doc = this.document;
	var list = doc.getElementById("list");
	
	var tree = doc.getElementById("igLinksTree");
	tree.onselect = changeImage;

	var currentId = 0;
	
	for (var i = firstPage; i <= lastPage; i++) {
		for (var j = 0; j < objLinks.links[i].length; j++) {
			var treeItem = doc.createElement("treeitem");
			treeItem.setAttribute("id", "req_" + currentId);

			var treeRow = doc.createElement("treerow");
			treeRow.setAttribute("properties", "checked");
			treeRow.setAttribute("id", "row_" + currentId);
	
			var treeCell0 = doc.createElement("treecell");
			treeCell0.setAttribute("value", "true");
			treeCell0.setAttribute("id", "tobeornottobe_" + currentId);

			var treeCell1 = doc.createElement("treecell");
			treeCell1.setAttribute("label", objLinks.links[i][j]);
			treeCell1.setAttribute("value", objLinks.links[i][j]);
			treeCell1.setAttribute("editable", "false");
			treeCell1.setAttribute("id", "url_" + currentId);
			if (objLinks.thumbs[i][j]) treeCell1.setAttribute("src", objLinks.thumbs[i][j].src);

			var treeCell2 = doc.createElement("treecell");
 			treeCell2.setAttribute("label", objLinks.hostID[i][j]);
 			treeCell2.setAttribute("value", objLinks.hostID[i][j]);
 			treeCell2.setAttribute("editable", "false");
 			treeCell2.setAttribute("id", "host_" + currentId);
			
			
			treeRow.appendChild(treeCell0);
			treeRow.appendChild(treeCell1);
			treeRow.appendChild(treeCell2);
			treeItem.appendChild(treeRow);
			list.appendChild(treeItem);
			currentId++;
		}
	}	
	
	if (tree.view.rowCount > 0) tree.view.selection.select(0);
	chgPreview(true);
	updateCounter();
}


function doOK() {
	var doc = this.document;
	var newObjLinks = new LinksOBJ();
	var currentId = 0;
			
	for (var i = firstPage; i <= lastPage; i++) {
		newObjLinks.links[i] = new Array();
		newObjLinks.dirSave[i] = new Array();
		newObjLinks.hostFunc[i] = new Array();
		newObjLinks.hostID[i] = new Array();
		newObjLinks.maxThreads[i] = new Array();
		newObjLinks.downloadTimeout[i] = new Array();
		newObjLinks.originatingPage[i] = new Array();
		
		for (var j = 0; j < objLinks.links[i].length; j++) {
			var shakespeare = doc.getElementById("tobeornottobe_" + currentId);
			
			if (shakespeare.getAttribute("value") == "true") {
				newObjLinks.links[i].push(objLinks.links[i][j]);
				newObjLinks.dirSave[i].push(objLinks.dirSave[i][j]);
				newObjLinks.hostFunc[i].push(objLinks.hostFunc[i][j]);
				newObjLinks.hostID[i].push(objLinks.hostID[i][j]);
				newObjLinks.maxThreads[i].push(objLinks.maxThreads[i][j]);
				newObjLinks.downloadTimeout[i].push(objLinks.downloadTimeout[i][j]);
				newObjLinks.originatingPage[i].push(objLinks.originatingPage[i][j]);
			}
			
			currentId++;
		}
	}

	params.out = {links:newObjLinks};
    
	return true;
}


function LinksOBJ() {
	this.links = new Array();
	this.dirSave = new Array();
	this.hostFunc = new Array();
	this.hostID = new Array();
	this.maxThreads = new Array();
	this.downloadTimeout = new Array();
	this.originatingPage = new Array();
}


function setFocus(someId) {
	var doc = this.document;
	var obj = doc.getElementById(someId);
	obj.focus();
}


function doSetAll(value) {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	
	for (var i = 0; i < tree.view.rowCount; i++) {  
		var shakespeare = doc.getElementById("tobeornottobe_" + i);
		shakespeare.setAttribute("value", value);
		var row = doc.getElementById("row_" + i);
		row.setAttribute("properties", value == "true"?"checked":"");
	}
	
	updateCounter();
}


function doInvertSelection() {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	
	for (var i = 0; i < tree.view.rowCount; i++) {  
		var shakespeare = doc.getElementById("tobeornottobe_" + i);
		shakespeare.setAttribute("value", !(shakespeare.getAttribute("value") == "true"));
		var row = doc.getElementById("row_" + i);
		row.setAttribute("properties", shakespeare.getAttribute("value") == "true"?"checked":"");
	}
	
	updateCounter();
}


function applyCmd(cmd) {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	if (tree.view.rowCount == 0) return;
	
	var nWinCheck = false;
		
	var start = new Object();
	var end = new Object();
	var numRanges = tree.view.selection.getRangeCount();

	for (var i = 0; i < numRanges; i++) {
		tree.view.selection.getRangeAt(i, start, end);
		for (var j = start.value; j <= end.value; j++) {
			switch(cmd) {
				case "true":
				case "false":
					var shakespeare = doc.getElementById("tobeornottobe_" + j);
					shakespeare.setAttribute("value", cmd);
					var row = doc.getElementById("row_" + j);
					row.setAttribute("properties", cmd == "true"?"checked":"");
					break;
				case "toggle":
					var shakespeare = doc.getElementById("tobeornottobe_" + j);
					shakespeare.setAttribute("value", !(shakespeare.getAttribute("value") == "true"));
					var row = doc.getElementById("row_" + j);
					row.setAttribute("properties", shakespeare.getAttribute("value") == "true"?"checked":"");
					break;
				case "open":
					/*var reqUrl = doc.getElementById("url_" + j).getAttribute("value");
					if (!nWinCheck) {
						var nWin = window.open(reqUrl,reqUrl,"menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes");
						nWinCheck = true;
					} 
					else {
						var win = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
						win.openUILinkIn(reqUrl, "tab");
					}*/
					break;
				default:
			}
		}
	}
	
	updateCounter();
}


function applyFilter() {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	if (tree.view.rowCount == 0) return;
	
	var type = doc.getElementById("filterType");
	var value = doc.getElementById("filterValue");
	var filterOn = doc.getElementById("filterOn");
	var filter = null;
	
	if (type.value == "simple") {
		var tmp = value.value;
		
		// Stuff we need to escape before building the regex
		tmp = tmp.replace(/\//g,"\\\/");
		tmp = tmp.replace(/\./g,"\\.");
		
		// Wildcards: * ?
		tmp = tmp.replace(/\*/g,".*");
		tmp = tmp.replace(/\?/g,".");
		
		filter = new RegExp(tmp, "i");
		}
	else filter = new RegExp(value.value, "i");
		
	var currentId = 0;
	
	for (var i = firstPage; i <= lastPage; i++) {
		for (var j = 0; j < objLinks.links[i].length; j++) {
			var shakespeare = doc.getElementById("tobeornottobe_" + currentId);
			var matched = false;
			
			var str = (filterOn.value == "url")?objLinks.links[i][j]:objLinks.hostID[i][j];
			
			matched = (str.search(filter) >= 0);
			
			shakespeare.setAttribute("value", matched);
			var row = doc.getElementById("row_" + currentId);
			row.setAttribute("properties", matched?"checked":"");

			currentId++;
		}
	}

	updateCounter();
}


function chgPreview(initialChange) {
	var togThumb = document.getElementById("togThumb");
	var isChecked = togThumb.checked;

	var pbox = document.getElementById("previewBox");
	var rbox = document.getElementById("rowHeightBox");
	
	var ss = 1;
	var cssRules = document.styleSheets[ss].cssRules;
	
	var list = document.getElementById("list");
	var numRows = list.childNodes.length;
	

	if (isChecked) {	
		var indices = new Array();
		
		for(var a = 0; a < cssRules.length; a++) {
			if (cssRules[a].cssText.match(/-moz-tree-row /)) indices.push(a);
			if (cssRules[a].cssText.match(/-moz-tree-image /)) indices.push(a);
		}
		
		indices = indices.sort();
		
		for (var a = indices.length-1; a >= 0; a--) {
			document.styleSheets[ss].deleteRule(indices[a]);
		}
				
		for (var b = 0; b < numRows; b++) {
			var treeCell = document.getElementById("url_" + b);
			treeCell.setAttribute("src",null);
		}
		pbox.hidden = false;
		rbox.hidden = true;
	}
	else {
		if (initialChange) {
			var indices = new Array();
		
			for(var a = 0; a < cssRules.length; a++) {
				if (cssRules[a].cssText.match(/-moz-tree-row /)) indices.push(a);
				if (cssRules[a].cssText.match(/-moz-tree-image /)) indices.push(a);
			}
		
			indices = indices.sort();
		
			for (var a = indices.length-1; a >= 0; a--) {
				document.styleSheets[ss].deleteRule(indices[a]);
			}
		}
	
		var rowHeightVal = document.getElementById("rowHeightVal");

		if (rowHeightVal.value) newVal = rowHeightVal.value;
		else newVal = "150";

		rule1 = "treechildren::-moz-tree-row { height: "+newVal+"px; }";
		rule2 = "treechildren::-moz-tree-image { height: "+newVal+"px; }";
		document.styleSheets[ss].insertRule(rule1,0);
		document.styleSheets[ss].insertRule(rule2,cssRules.length);
	
		//document.styleSheets[ss].insertRule("treechildren::-moz-tree-row { height: 150px; }",cssRules.length);
		//document.styleSheets[ss].insertRule("treechildren::-moz-tree-image { height: 150px; }",cssRules.length);
		
		var currentId = 0;

		for (var a = firstPage; a <= lastPage; a++) {
			for (var b = 0; b < objLinks.links[a].length; b++) {
				var treeCell = document.getElementById("url_" + currentId);
				if (objLinks.thumbs[a][b]) treeCell.setAttribute("src", objLinks.thumbs[a][b].src);
				currentId++;
			}
		}
		pbox.hidden = true;
		rbox.hidden = false;
	}
	list.hidden = true;
	setTimeout("document.getElementById('list').hidden = false;",100);
}


function chgRowHeight() {
	var rowHeightVal = document.getElementById("rowHeightVal");
	var list = document.getElementById("list");
	
	var ss = 1;
	var cssRules = document.styleSheets[ss].cssRules;
	var indices = new Array();
	
	for(var a = 0; a < cssRules.length; a++) {
		if (cssRules[a].cssText.match(/-moz-tree-row /)) indices.push(a);
		if (cssRules[a].cssText.match(/-moz-tree-image /)) indices.push(a);
	}
	
	indices = indices.sort();
	
	for (var a = indices.length-1; a >= 0; a--) {
		document.styleSheets[ss].deleteRule(indices[a]);
	}

	if (rowHeightVal.value) newVal = rowHeightVal.value;
	else newVal = "150";
	
	rule1 = "treechildren::-moz-tree-row { height: "+newVal+"px; }";
	rule2 = "treechildren::-moz-tree-image { height: "+newVal+"px; }";
	document.styleSheets[ss].insertRule(rule1,0);
	document.styleSheets[ss].insertRule(rule2,cssRules.length);

	list.hidden = true;
	setTimeout("document.getElementById('list').hidden = false;",100);
}


function changeImage() {
	var doc = document;
	var tree = doc.getElementById("igLinksTree");
	if (tree.view.rowCount == 0) return;
	
	var current = tree.view.selection.currentIndex;
	var thumb = doc.getElementById("thumbnail");
	
	var previewLabel = doc.getElementById("previewLabel");
	if (!objLinks.thumbs[firstPage][current]) {
		//There's no thumbnail to show...
		previewLabel.selectedIndex = 0;
		thumb.src = "";
		return;
	}
	
	previewLabel.selectedIndex = 1;
	thumb.src = objLinks.thumbs[firstPage][current].src;
	
	var w = objLinks.thumbs[firstPage][current].width;
	var h = objLinks.thumbs[firstPage][current].height;
	
	resizeImage(w, h);
}


function resizeImage(w, h) {
	var doc = this.document;
	var thumb = doc.getElementById("thumbnail");
	
	var maxSize = 140;
	var currentW = w;
	var currentH = h;
	
	if (w > maxSize) {
		currentW = maxSize;
		currentH = maxSize * h/w;
	}
	if (currentH > maxSize) {
		currentW = maxSize * w/h;
		currentH = maxSize;
	}
	
	thumb.width = currentW;
	thumb.height = currentH;
}


function onTreeClicked(event) {
	var doc = document;
	var tree = doc.getElementById("igLinksTree");
	var tbo = tree.treeBoxObject;

	// Get the row, column and child element at the point
	var row = {}, col = {}, child = {};
	tbo.getCellAt(event.clientX, event.clientY, row, col, child);

	var shakespeare = doc.getElementById("tobeornottobe_" + row.value);
	var currentRow = doc.getElementById("row_" + row.value);
  
	currentRow.setAttribute("properties", shakespeare.getAttribute("value")=="true"?"checked":"");
	
	updateCounter();
}


function updateCounter() {
   var doc = this.document;
   var strbundle = doc.getElementById("imagegrabber-strings");
   
   var tree = doc.getElementById("igLinksTree");
   var counter = 0;
   
   for (var i = 0; i < tree.view.rowCount; i++) {
      if (doc.getElementById("row_" + i).getAttribute("properties") == "checked") counter++;
   }
   with (doc.getElementById("selectionCounter"))
      value = strbundle.getFormattedString("images_selected_counter", [counter, tree.view.rowCount]);
}