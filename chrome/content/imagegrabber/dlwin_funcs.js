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

windowWatcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);

ihg_Functions.clearFromWin = function clearFromWin(reqID, ignoreAutoClear) {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	ihg_Functions.LOG("In " + myself + ", reqID: " + reqID + "\n");

	var doc = ig_dl_win.document;
	var autoClear = doc.getElementById("cbAutoClear").checked;

	if (!autoClear && !ignoreAutoClear) return;

	// var outBox = doc.getElementById("outBox");
	var treeItem = doc.getElementById(reqID);
	var parentItem = treeItem.parentNode;

	parentItem.removeChild(treeItem);

	var reqs = ig_dl_win.req_objs;

	try {
		var index = reqs[reqID].index;
		reqs.splice(index, 1);
		delete reqs[reqID];

		ig_dl_win.req_objs = ihg_Functions.setUpLinkedList(reqs);
		}
	catch(e) {}

	var containerItem = parentItem.parentNode;
	if (containerItem.getAttribute("container")) {
		if (!parentItem.hasChildNodes()) {
			containerItem.removeChild(parentItem);
			setTimeout(ihg_Functions.clearFromWin, 1000, containerItem.id, true);
			}
		}

	ihg_Functions.LOG("Exiting " + myself + "\n");
	}

ihg_Functions.addDownloadReqObjs = function addDownloadReqObjs(req_objs) {
	if (!req_objs || req_objs.length == 0) return;

	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var doc = ig_dl_win.document;

	var outBox = doc.getElementById("outBox");

	var treeItem = doc.createElement("treeitem");
	treeItem.setAttribute("id", "page_" + (Math.floor(1e9 * (1 + Math.random()))).toString().substring(1));
	treeItem.setAttribute("container", "true");
	treeItem.setAttribute("open", "true");

	var treeRow = doc.createElement("treerow");
	var treeCell0 = doc.createElement("treecell");
	treeCell0.setAttribute("label", ihg_Globals.strings.page + " " + req_objs[0].pageNum + " : " + req_objs.length + " Reqs");
	var treeCell1 = doc.createElement("treecell");
	treeCell1.setAttribute("label", ihg_Globals.docTitle);
	var treeCell2 = doc.createElement("treecell");
	var treeCell3 = doc.createElement("treecell");
	treeRow.appendChild(treeCell0);
	treeRow.appendChild(treeCell1);
	treeRow.appendChild(treeCell2);
	treeRow.appendChild(treeCell3);
	treeItem.appendChild(treeRow);

	var treeChildren = doc.createElement("treechildren");
	for (var i = 0; i < req_objs.length; i++) {
		let treeItem = doc.createElement("treeitem");
		treeItem.setAttribute("id", req_objs[i].uniqID);

		let treeRow = doc.createElement("treerow");

		let treeCell0 = doc.createElement("treecell");
		let m = req_objs[i].curLinkNum + 1;
		let page_stat = ihg_Globals.strings.page + " " + req_objs[i].pageNum + ": " + m + " " + ihg_Globals.strings.of + " " + req_objs[i].totLinkNum;
		treeCell0.setAttribute("label", page_stat);
		treeCell0.setAttribute("id", "page_stat_" + req_objs[i].uniqID);

		let treeCell1 = doc.createElement("treecell");
		treeCell1.setAttribute("label", req_objs[i].reqURL);
		treeCell1.setAttribute("id", "fname_" + req_objs[i].uniqID);

		let treeCell2 = doc.createElement("treecell");
		treeCell2.setAttribute("mode", "normal");
		if (req_objs[i].maxProgress > 0) treeCell2.setAttribute("value", String(100 * (req_objs[i].curProgress / req_objs[i].maxProgress)))
		else treeCell2.setAttribute("value", "0");
		treeCell2.setAttribute("id", "prog_met_" + req_objs[i].uniqID);

		let treeCell3 = doc.createElement("treecell");
		treeCell3.setAttribute("label", req_objs[i].status ? req_objs[i].status : ihg_Globals.strings.waiting);
		treeCell3.setAttribute("id", "stat_text_" + req_objs[i].uniqID);

		treeRow.appendChild(treeCell0);
		treeRow.appendChild(treeCell1);
		treeRow.appendChild(treeCell2);
		treeRow.appendChild(treeCell3);

		treeItem.appendChild(treeRow);

		treeChildren.appendChild(treeItem);
		}
	treeItem.appendChild(treeChildren);

	outBox.appendChild(treeItem);

	ihg_Functions.LOG("Exiting " + myself + "\n");
	}

ihg_Functions.addDownloadProgress = function addDownloadProgress(page_stat, some_id, fName, status_text) {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var doc = ig_dl_win.document;

	//try {	ig_dl_win.req_objs[some_id].status = status_text; }
	//catch(e) { throw "IHG error: couldn't write status to req_objs in addDownloadProgress"; }

	var outBox = doc.getElementById("outBox");
	var treeItem = doc.createElement("treeitem");
	treeItem.setAttribute("id", some_id);

	var treeRow = doc.createElement("treerow");

	var treeCell0 = doc.createElement("treecell");
	treeCell0.setAttribute("label", page_stat);
	treeCell0.setAttribute("id", "page_stat_" + some_id);

	var treeCell1 = doc.createElement("treecell");
	treeCell1.setAttribute("label", fName);
	treeCell1.setAttribute("id", "fname_" + some_id);

	var treeCell2 = doc.createElement("treecell");
	treeCell2.setAttribute("mode", "normal");
	treeCell2.setAttribute("value", "0");
	treeCell2.setAttribute("id", "prog_met_" + some_id);

	var treeCell3 = doc.createElement("treecell");
	treeCell3.setAttribute("label", status_text);
	treeCell3.setAttribute("id", "stat_text_" + some_id);

	treeRow.appendChild(treeCell0);
	treeRow.appendChild(treeCell1);
	treeRow.appendChild(treeCell2);
	treeRow.appendChild(treeCell3);
	treeItem.appendChild(treeRow);
	outBox.appendChild(treeItem);

	ihg_Functions.LOG("Exiting " + myself + "\n");
	}

/* first arg is the request id, or the id of the object you are trying to add.
 * the rest of the args are optional... they correspond to the fields that
 * are to be updated.  A null value will result in nothing being set for that
 * column.
 */
ihg_Functions.updateDownloadProgress = function updateDownloadProgress(page_stat, some_id, fname, progress, status) {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var doc = ig_dl_win.document;

	//try {	ig_dl_win.req_objs[some_id].status = status; }
	//catch(e) { throw "IHG error: couldn't write status to req_objs in updateDownloadProgress"; }

	if (page_stat) {
		var pStat = doc.getElementById("page_stat_" + some_id);
		if (!pStat) throw "IHG error: pStat is null in updateDownloadProgress";
		pStat.setAttribute("label", page_stat);
		}

	if (fname) {
		var fName = doc.getElementById("fname_" + some_id);
		if (!fName) throw "IHG error: fName is null in updateDownloadProgress";
		fName.setAttribute("label", fname);
		}

	if (progress) {
		var progMet = doc.getElementById("prog_met_" + some_id);
		if (!progMet) throw "IHG error: progMet is null in updateDownloadProgress";
		progMet.setAttribute("value", String(progress));
		}

	if (status) {
		var statText = doc.getElementById("stat_text_" + some_id);
		if (!statText) throw "IHG error: statText is null in updateDownloadProgress";
		statText.setAttribute("label", status);
		}

	ihg_Functions.LOG("Exiting " + myself + "\n");
	}

ihg_Functions.updateDownloadStatus = function updateDownloadStatus(someText) {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var doc = ig_dl_win.document;

	var statLabel = doc.getElementById("statLabel");
	statLabel.value = someText;
	}

ihg_Functions.setFocus = function setFocus() {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;
	
	var tree = ig_dl_win.document.getElementById("igTree");
	tree.focus();
	if (tree.view.rowCount > 0) tree.view.selection.select(0);
	}

ihg_Functions.startCloseCountdown = function startCloseCountdown() {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) return;

	var req_objs = ig_dl_win.req_objs;
	if (req_objs) {
		for (var i = 0; i < req_objs.length; i++) {
			if (req_objs[i].finished == false || req_objs[i].aborted == true)
				return;
			}
		}

	ihg_Globals.closeCountdown = ihg_Globals.DLWindowCloseImmediately ?  0 : 5;

	if (ihg_Globals.closeInterval) clearInterval(ihg_Globals.closeInterval);
	ihg_Globals.closeInterval = setInterval(ihg_Functions.closeWindow, 800);
	}

ihg_Functions.closeWindow = function closeWindow() {
	var ig_dl_win = windowWatcher.getWindowByName("ig-dl_win", null);

	if (ig_dl_win && ihg_Globals.closeCountdown > 0)
		ihg_Functions.updateDownloadStatus(ihg_Globals.strings.closing([ihg_Globals.closeCountdown--]));
	else {
		clearInterval(ihg_Globals.closeInterval);
		ihg_Globals.closeInterval = null;
		ihg_Globals.closeCountdown = null;

		if (!ig_dl_win) return;

		var req_objs = ig_dl_win.req_objs;
		if (req_objs) {
			// We check the download list again, just to make sure that the 
			// user hasn't added new downloads that are currently in progress
			for (var i = 0; i < req_objs.length; i++) {
				if (req_objs[i].finished == false || req_objs[i].aborted == true) {
					ihg_Functions.updateDownloadStatus(ihg_Globals.strings.running);
					return;
					}
				}
			}

		ig_dl_win.close();
		}
	}