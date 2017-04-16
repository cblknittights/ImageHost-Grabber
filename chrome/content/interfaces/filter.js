var objLinks;
var firstPage; 
var lastPage;
var params = window.arguments[0];

ihgPlural = {};


function onUnLoad() {
	with (document.getElementById("rowHeightVal"))
		setAttribute("saved", value);
}

function onLoad() {
	with (document.getElementById("rowHeightVal"))
		value = getAttribute("saved");

	try {
		Components.utils.import("resource://gre/modules/PluralForm.jsm");
		[ihgPlural.get, ihgPlural.numForms] = PluralForm.makeGetter(ihg_Globals.strings.pluralRule);
		}
	catch (e) {																			// Components.utils.import not available before FF3.0
		let aRuleNum = ihg_Globals.strings.pluralRule;
		if (aRuleNum < 0 || aRuleNum > 15 || isNaN(aRuleNum)) aRuleNum = 0;				// pluralRule is in range [0-15]
		let index = [0, 1, 1, 2, 3, 2, 2, 2, 2, 2, 3, 4, 3, 3, 2, 1][aRuleNum];			// the most common rule index is used here...
		ihgPlural.get = function(aNum, aWords) aWords.split(/;/)[index];
		ihgPlural.numForms = function() 1;
		}
	ihgPlural.getFormatted = function(aNum, aWords, anArray) {
		let words = ihgPlural.get(aNum, aWords);
		anArray.forEach(function(value) {words = words.replace(/%S|\b__\b/, value);});
		return words;
		}

	var lastDLDirHistory = document.getElementById("lastDLDirHistory");
	var DLDirList = document.getElementById("DLDirList");
	parse(lastDLDirHistory.value).forEach(function(DLDir) {
		with (DLDirList.appendItem(DLDir)) {
			setAttribute("crop", "start");
			setAttribute("tooltiptext", DLDir);
			}
		});
	DLDirList.selectedIndex = 0;

	objLinks = params.inn.links;
	firstPage = params.inn.firstPage;
	lastPage = params.inn.lastPage;

	var doc = this.document;
	var list = doc.getElementById("list");

	var tree = doc.getElementById("igLinksTree");
	tree.onselect = changeImage;

	var hostlist = [];
	var currentId = 0;

	for (var i = firstPage; i <= lastPage; i++) {
		for (var j = 0; j < objLinks.links[i].length; j++, currentId++) {
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

			if (hostlist.indexOf(objLinks.hostID[i][j]) < 0) hostlist.push(objLinks.hostID[i][j]);

			treeRow.appendChild(treeCell0);
			treeRow.appendChild(treeCell1);
			treeRow.appendChild(treeCell2);
			treeItem.appendChild(treeRow);
			list.appendChild(treeItem);
		}
	}

	var HostList_popup = doc.getElementById("host_list");
	if (hostlist.length > 1) {
		HostList_popup.removeAttribute("hidden");
		hostlist.sort();

		var menuseparator = HostList_popup.firstChild;
		
		for (var i = 0; i < hostlist.length; i++) {
			var menuItem = doc.createElement("menuitem");
			menuItem.setAttribute("label", hostlist[i]);
			menuItem.setAttribute("value", hostlist[i]);
			menuItem.setAttribute("type", "checkbox");
			menuItem.setAttribute("checked", "true");
			HostList_popup.insertBefore(menuItem, menuseparator);
			}
		}
	else HostList_popup.setAttribute("hidden", true);

	if (tree.view.rowCount > 0) tree.view.selection.select(0);
	chgPreview(true);
	updateCounter();
	setFocus('igLinksTree');
}


function MaskHost(HostID_target) {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	var HostIDidx = tree.columns.getNamedColumn("host").index;

	if (HostID_target.value == "") {
		Array.forEach(doc.getElementById("host_list").childNodes, function(menuItem) {menuItem.setAttribute("checked", "true")});
		Array.forEach(doc.getElementById("list").childNodes, function(req_row) {req_row.removeAttribute("hidden")});
		HostID_target.removeAttribute("checked");
		}
	else
		Array.filter(doc.getElementById("list").childNodes, function(req_row) {return (req_row.firstChild.childNodes[HostIDidx].getAttribute("value") == HostID_target.value)})
			.forEach(function(req_row) {
				if (HostID_target.hasAttribute("checked")) req_row.removeAttribute("hidden");
				else req_row.hidden = true;
				});

	updateCounter();
}


function doOK(queuePaused) {
	var doc = this.document;
	var newObjLinks = new LinksOBJ();
	var currentId = 0;

	for (var i = firstPage; i <= lastPage; i++) {
		for (let ObjLinkProp in newObjLinks) {newObjLinks[ObjLinkProp][i] = new Array();};

		for (var j = 0; j < objLinks.links[i].length; j++, currentId++) {
			if (doc.getElementById("req_" + currentId).getAttribute("hidden") == "true") continue;

			var shakespeare = doc.getElementById("tobeornottobe_" + currentId);

			if (shakespeare.getAttribute("value") == "true") {
				for (let ObjLinkProp in newObjLinks) {newObjLinks[ObjLinkProp][i].push(objLinks[ObjLinkProp][i][j]);};
			}

		}
	}

	var baseDirSave = document.getElementById("DLDirList").label;
	var lastDLDirHistory = document.getElementById("lastDLDirHistory");
	var lastDLDirHistoryValue = parse(lastDLDirHistory.value);
	lastDLDirHistoryValue = lastDLDirHistoryValue.filter(dldir => dldir != baseDirSave);
	if (lastDLDirHistoryValue.unshift(baseDirSave) > 8) lastDLDirHistoryValue.pop();
	lastDLDirHistory.value = stringify(lastDLDirHistoryValue);
	document.getElementById("lastDLDir").value = baseDirSave;

	params.out = {pause:queuePaused, links:newObjLinks};

	return true;
}


function LinksOBJ() {
	this.links = new Array();
//	this.dirSave = new Array();
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
	var CheckboxColIdx = tree.columns.getNamedColumn("tobeornottobe").index;

	for (var i = 0; i < tree.view.rowCount; i++) {  
		var row = tree.view.getItemAtIndex(i).firstChild;
		var shakespeare = row.childNodes[CheckboxColIdx];
		var newVal = (value == "toggle" ? !(shakespeare.getAttribute("value") == "true") : value == "true");
		shakespeare.setAttribute("value", newVal);
		row.setAttribute("properties", newVal ?"checked":"");
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

	var CheckboxColIdx = tree.columns.getNamedColumn("tobeornottobe").index;
	var UrlColIdx = tree.columns.getNamedColumn("url").index;

	var start = new Object();
	var end = new Object();
	var numRanges = tree.view.selection.getRangeCount();

	for (var i = 0; i < numRanges; i++) {
		tree.view.selection.getRangeAt(i, start, end);
		for (var j = start.value; j <= end.value; j++) {
			var row = tree.view.getItemAtIndex(j).firstChild;
			var shakespeare = row.childNodes[CheckboxColIdx];
			switch(cmd) {
				case "true":
				case "false":
					shakespeare.setAttribute("value", cmd);
					row.setAttribute("properties", cmd == "true"?"checked":"");
					break;
				case "toggle":
					shakespeare.setAttribute("value", !(shakespeare.getAttribute("value") == "true"));
					row.setAttribute("properties", shakespeare.getAttribute("value") == "true"?"checked":"");
					break;
				case "open":
					/* var reqUrl = row.childNodes[UrlColIdx].getAttribute("value");
					if (!nWin) {
						var nWin = window.open(reqUrl,reqUrl,"menubar=yes,toolbar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes");
					} 
					else {
						var win = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
						win.gBrowser.addTab(reqUrl);
					} */
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
		for (var j = 0; j < objLinks.links[i].length; j++, currentId++) {
			if (doc.getElementById("req_" + currentId).getAttribute("hidden") == "true") continue;

			var shakespeare = doc.getElementById("tobeornottobe_" + currentId);
			var matched = false;

			var str = (filterOn.value == "url")?objLinks.links[i][j]:objLinks.hostID[i][j];

			matched = (str.search(filter) >= 0);

			shakespeare.setAttribute("value", matched);
			var row = doc.getElementById("row_" + currentId);
			row.setAttribute("properties", matched?"checked":"");
		}
	}

	updateCounter();
}


function chgPreview(initialChange) {
	var togThumb = document.getElementById("togThumb");
	var isChecked = togThumb.checked;

	var prevLoc = document.getElementById("previewLoc");
	// var pbox = document.getElementById("previewBox");
	// var rbox = document.getElementById("rowHeightBox");

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
		// pbox.hidden = false;
		// rbox.hidden = true;
		prevLoc.selectedIndex = 0;
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

		newVal = document.getElementById("rowHeightVal").value || "150";

		rule1 = "treechildren::-moz-tree-row { height: "+newVal+"px; }";
		rule2 = "treechildren::-moz-tree-image { height: "+(newVal-2)+"px; }";
		document.styleSheets[ss].insertRule(rule1,0);
		document.styleSheets[ss].insertRule(rule2,cssRules.length);

		//document.styleSheets[ss].insertRule("treechildren::-moz-tree-row { height: 150px; }",cssRules.length);
		//document.styleSheets[ss].insertRule("treechildren::-moz-tree-image { height: 150px; }",cssRules.length);

		var currentId = 0;

		for (var a = firstPage; a <= lastPage; a++) {
			for (var b = 0; b < objLinks.links[a].length; b++, currentId++) {
				var treeCell = document.getElementById("url_" + currentId);
				if (objLinks.thumbs[a][b]) treeCell.setAttribute("src", objLinks.thumbs[a][b].src);
			}
		}
		// pbox.hidden = true;
		// rbox.hidden = false;
		prevLoc.selectedIndex = 1;
	}
	list.hidden = true;
	setTimeout(() => {list.hidden = false;}, 0);
}


function chgRowHeight() {
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

	newVal = document.getElementById("rowHeightVal").value || "150";

	rule1 = "treechildren::-moz-tree-row { height: "+newVal+"px; }";
	rule2 = "treechildren::-moz-tree-image { height: "+(newVal-2)+"px; }";
	document.styleSheets[ss].insertRule(rule1,0);
	document.styleSheets[ss].insertRule(rule2,cssRules.length);

	list.hidden = true;
	setTimeout(() => {list.hidden = false;}, 0);
}


function changeImage() {
	var doc = document;
	var tree = doc.getElementById("igLinksTree");
	if (tree.view.rowCount == 0) return;

	var current = tree.view.selection.currentIndex;
	if (current >= 0) {
		var current_treeItem = tree.view.getItemAtIndex(current);
		for (current = 0; current_treeItem = current_treeItem.previousSibling; current++);
		}

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
	if (!col.value || col.value.type != Components.interfaces.nsITreeColumn.TYPE_CHECKBOX) return;

	var currentRow = tree.view.getItemAtIndex(row.value).firstChild;
	var value = tbo.view.getCellValue(row.value, col.value);

	currentRow.setAttribute("properties", value=="true"?"checked":"");

	updateCounter();
}


function updateCounter() {
	var doc = this.document;
	var tree = doc.getElementById("igLinksTree");
	var counter = 0;

	for (var i = 0; i < tree.view.rowCount; i++) {
		if (tree.view.getItemAtIndex(i).firstChild.getAttribute("properties") == "checked") counter++;
		}
	with (doc.getElementById("selectionCounter"))
		value = ihgPlural.getFormatted(counter, getAttribute("_value"), [counter, tree.view.rowCount]);

	doc.documentElement.getButton("accept").disabled = (counter == 0);
	doc.documentElement.getButton("extra1").disabled = (counter == 0);
}