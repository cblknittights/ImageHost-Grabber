/****************************** Start of GPL Block ****************************
 *	ImageHost Grabber - Imagegrabber is a firefox extension designed to
 *	download pictures from image hosts such as imagevenue, imagebeaver, and
 *	others (see help file for a full list of supported hosts).
 *
 *	Copyright (C) 2007   Matthew McMullen.
 *
 *	This program is free software; you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation; either version 2 of the License, or
 *	(at your option) any later version.
 *
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with this program; if not, write to the Free Software
 *	Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 ***************************  End of GPL Block *******************************/


function rightOn() {

	const voidElementTags = {
		"area": 	1,
		"base": 	1,
		"basefont": 1,			// not HTML5
		"br": 		1,
		"col": 		1,
		"command": 	1,
		"embed": 	1,
		"frame": 	1,			// not HTML5
		"hr": 		1,
		"img": 		1,
		"input": 	1,
		"isindex": 	1,			// not HTML5
		"keygen": 	1,
		"link": 	1,
		"meta": 	1,
		"param": 	1,
		"source": 	1,
		"track": 	1,
		"wbr": 		1
		};

	const rawTxtElementTags = {
		"script": 	1,
		"style": 	1,
		"textarea": 1,
		"title": 	1
		};

	const optionalEndTags = {				//[bool: there is no more content in the parent element (parent element is closing), array: immediately following element]
		"colgroup": [false,	[]],
		"dd": 		[true,	["dd","dt"]],
		"dt": 		[false,	["dd","dt"]],
		"li": 		[true,	["li"]],
		"optgroup":	[true,	["optgroup"]],
		"option": 	[true,	["optgroup","option"]],
		"p": 		[true,	["address","article","aside","blockquote","dir","div","dl","fieldset","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","main","nav","ol","p","pre","section","table","ul"]],
		"rb":		[true,	["rb","rp","rt","rtc"]],
		"rp":		[true,	["rb","rp","rt","rtc"]],
		"rt":		[true,	["rb","rp","rt","rtc"]],
		"rtc":		[true,	["rb","rp","rt","rtc"]],
		"tbody":	[true,	["tbody","tfoot"]],
		"td": 		[true,	["td","th"]],
		"tfoot": 	[true,	["tbody"]],
		"th": 		[true,	["td","th"]],
		"thead": 	[false,	["tbody","tfoot"]],
		"tr": 		[true,	["tr"]]
		};

	this.document.getElementById("uniqID").value = reqObj.uniqID;
	this.document.getElementById("pageNum").value = reqObj.pageNum;
	this.document.getElementById("totLinkNum").value = reqObj.totLinkNum;
	this.document.getElementById("curLinkNum").value = reqObj.curLinkNum;
	this.document.getElementById("reqURL").value = reqObj.reqURL;
	this.document.getElementById("originatingPage").value = reqObj.originatingPage;
	this.document.getElementById("regexp").value = reqObj.regexp;
	this.document.getElementById("dirSave").value = reqObj.dirSave;
	this.document.getElementById("reqURL").setAttribute("tooltiptext", reqObj.hostID);
	if (reqObj.POSTData) {
		var groups = reqObj.reqURL.match(reqObj.POSTData.urlPattern);
		var POSTData = reqObj.POSTData.POSTData;
		for (var i = groups.length; i--;) {
			POSTData = POSTData.replace(new RegExp("\\$" + i + "(?=\\D|$)", "g"), groups[i]);
			}
		this.document.getElementById("regexp").setAttribute("tooltiptext", reqObj.POSTData.urlPattern + "\n" + POSTData);
		}
	try {
		this.document.getElementById("readyState").value = reqObj.xmlhttp.readyState;
		this.document.getElementById("statusText").value = reqObj.xmlhttp.statusText;
		this.document.getElementById("responseText").value = reqObj.xmlhttp.responseText;
		}
	catch(e) { return; }

	var responseTags = this.document.getElementById("responseTags");
	responseTags.hidden = true;
	while (responseTags.hasChildNodes()) responseTags.removeChild(responseTags.lastChild);
	responseTags.hidden = false;

	var contType = reqObj.xmlhttp.getResponseHeader("Content-type");
	if (!contType || !/^text\//.test(contType)) return;

	var temp_responseText = reqObj.xmlhttp.responseText.replace(/\r+\n?/g, "\n");		// newlines are represented by LF characters, never any CR characters in input to tokenization stage
	temp_responseText = temp_responseText.replace(/<!(?=--)[^]*?-->/g, "");					// no comment...
	temp_responseText = temp_responseText.replace(/<!\[CDATA\[[^]*?\]\]>/g, "");			// no markup here, just raw text so...
	var htmltag_regexp = /<\/(?:h[1-6]|[a-z]+)\s*>|<(?:h[1-6]|[a-z]+)(?:[\s/]+[\w-:]+(?:\s*=\s*(?:("|')[^]*?\1[^\w\s>]*|[^\s"'<>]+))?)*\s*\/?>/ig;
	var	tags = temp_responseText.match(htmltag_regexp);
	tags.push("</FileBoundary>");
	var openElemsStack = ["fileboundary"];
	var indent = 0;
	var reqDetails = [];

	for (var i = 0; i < tags.length; i++) {
		var Tag_Name = tags[i].match(/^<\/?(\w+)\b/)[1];
		var tag_name = Tag_Name.toLowerCase();
		var _endTag_ = (/^<\/\w+\b/.test(tags[i]));
		var self_End = (/\/>$/.test(tags[i]));
		var voidElem = (tag_name in voidElementTags);
		if (_endTag_ && voidElem) continue;													// void elements do not need end-tag... let's skip it!

		if (self_End) {																		// self closing start tags do not exist in HTML...
			tags[i] = tags[i].replace(/\s*\/(?=\>$)/, "");									// but is OK in HTML5 if void element!
			if (!voidElem) {																// but is OK in HTML5 if void element!
				if (true) tags.splice(i+1, 0, "</" + Tag_Name + ">");						// otherwise empty element needs end-tag
				}
			}

		var openElem = openElemsStack.pop();
		var rawTxtElementTag = openElem in rawTxtElementTags;
		var OptionalEndTag = openElem in optionalEndTags;
		var ScopeError = 0;
		if (_endTag_) {
			ScopeError = (openElem != tag_name) ? 1 : 0;
			if (ScopeError) {
				if (rawTxtElementTag) {
					openElemsStack.push(openElem);
					continue;
					}
				if (openElemsStack.indexOf(tag_name) >= 0) {
					tags.splice(i, 0, "</" + openElem + ">");
					tag_name = openElem;
					ScopeError = 2;
					if (OptionalEndTag && optionalEndTags[openElem][0]) ScopeError = 3;
					indent--;
					}
				else openElemsStack.push(openElem);
				}
			else indent--;
			}
		else {																	// Check here whether the new opening tag is closing the parent element
			if (OptionalEndTag && optionalEndTags[openElem][1].indexOf(tag_name) >= 0) {
				_endTag_ = true;
				tags.splice(i, 0, "</" + openElem + ">");
				tag_name = openElem;
				ScopeError = 2;
				indent--;
				}
			else {
				openElemsStack.push(openElem);
				if (rawTxtElementTag) continue;
				}
			}

		reqDetails.push({level: indent, value: tags[i], open: (_endTag_ || voidElem) ? null : true});

		if (!(_endTag_ || voidElem)) {
			openElemsStack.push(tag_name);
			indent++;
			}
		}

	gdetailsView = new detailsView(reqDetails);
	this.document.getElementById("igtree").view = gdetailsView;
	}

function detailsView(details) {
	this._details = details;
	}

detailsView.prototype = {
	_details: null,
	_treebox: null,

	get lastIndex() {
		return this.rowCount - 1;
		},
	get selectedIndex() {
		var seln = this.selection;
		if (seln.getRangeCount() > 0) {
			var min = {};
			seln.getRangeAt(0, min, {});
			return min.value;
			}
		return -1;
		},

	// Helpers
	rowCountChanged: function (index, count) {
		this._treebox.rowCountChanged(index, count);
		},
	invalidate: function () {
		this._treebox.invalidate();
		},

	ensureRowIsVisible: function (index) {
		this._treebox.ensureRowIsVisible(index);
		},

// nsITreeView
	get rowCount() {
		return this._details.length;
		},
	getImageSrc: function(index, column) { },
	setTree: function(tree) {
		this._treebox = tree;
		},
	selection: null,
	getRowProperties: function(index) {
		return this._details[index].value.match(/^<\/?(\w+)/)[1].toLowerCase();
		},
	getCellProperties: function(index, column) {
		if (column.id == "level") return this._details[index].value.match(/^<\/?(\w+)/)[1].toLowerCase();
		},
	getColumnProperties: function(column) { return ""; },
	isContainer: function(index) {
		return "open" in this._details[index];
		},
	isContainerOpen: function(index) {
		return this._details[index].open;
		},
	isContainerEmpty: function(index) {
		if (index < this.rowCount-1) {
			if (this._details[index].level < this._details[index+1].level) return false;
			let children = this._details[index].children;
			if (children) return children.length == 1;
			}
		this._details[index].open = false;
		return true;
		},
	getParentIndex: function(index) {
		if (this._details[index].level > 0) {
			var level = this._details[index].level - 1;
			for (var i = index - 1; i && (level < this._details[i].level) ; i--);
			return i;
			}
		else return -1;
		},
	hasNextSibling: function(parentIndex, index) {
		return true;
		},
	getLevel: function(index) {
		return this._details[index].level;
		},
	toggleOpenState: function(index) {
		if (!this.isContainer(index)) return;
		let item = this._details[index];
		item.open = !item.open;
		if (item.open) {
			if (item.children) {
				var toinsert = item.children;
				for (var i = 0; i < toinsert.length; i++)
					this._details.splice(index + i + 1, 0, toinsert[i]);
				this._treebox.rowCountChanged(index + 1, toinsert.length);
				delete item.children;
				}
			else item.open = !item.open;
			}
		else {
			if (this.isContainerEmpty(index)) return;
			let level = item.level;
			for (var t = index + 1; t < this.rowCount && this.getLevel(t) > level; t++);
			var deletecount = t - index;
			item.children = this._details.splice(index + 1, deletecount);
			this._treebox.rowCountChanged(index + 1, -deletecount);
			}
		this._treebox.invalidateRow(index);
		},
	isSeparator: function(index) { return this._details[index].level < 0; },
	isSorted: function(index) { return false; },
	getProgressMode: function(index, column) { },
	getCellValue: function(index, column) {
		return undefined;
		},
	getCellText: function(index, column) {
		if (column.id == "tag") {
			var closing_tag = null;
			let children = this._details[index].children;
			if (children) {
				closing_tag = children[children.length-1].value;
				if (children.length > 1) closing_tag = "..." + closing_tag;
				}
			return this._details[index].value + (closing_tag || "");
			}
		return "";
		},
	cycleHeader: function(column) { },
	selectionChanged: function() { },
	cycleCell: function(row, column) { },
	isEditable: function(index, column) { return false; },
	isSelectable: function(index, column) { return false; },
	setCellValue: function(index, column, type) { },
	setCellText: function(index, column, value) { },
	performAction: function(action) { },
	performActionOnRow: function(action, index) { },
	performActionOnCell: function(action, index, column) { }
	}

this.watch('reqObj', (a, b, c) => {setTimeout(rightOn, 0); return c});