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
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with this program; if not, write to the Free Software
 *	Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 ***************************  End of GPL Block *******************************/

var content = window;
content.window = window;


promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);


function onClose(event) {
	if (typeof req_objs === "undefined" || req_objs.length == 0) return;

	var DLWindowSuppressCloseConfirm = document.getElementById("DLWindowSuppressCloseConfirm");

	var undelayed_confirm = false;
	for (var i = req_objs.length; i--; ) {
		try {
			var daNode = document.getElementById(req_objs[i].uniqID);
			var someShit = daNode.nodeName;
			}
		catch(e) { continue; }

		if (req_objs[i].inprogress == true) {
			undelayed_confirm = false;
			break;
			}
		if (req_objs[i].finished == false || req_objs[i].aborted == true) {
			undelayed_confirm = true;
			}

		if (i == 0 && undelayed_confirm == false) return;
		}

	var buttonflag = promptService.BUTTON_TITLE_SAVE		 * promptService.BUTTON_POS_0 +
					 promptService.BUTTON_TITLE_DONT_SAVE	 * promptService.BUTTON_POS_2 +
					 promptService.BUTTON_TITLE_CANCEL		 * promptService.BUTTON_POS_1 +
					 promptService.BUTTON_POS_1_DEFAULT;												// CANCEL by default

	if (undelayed_confirm == false)
		buttonflag += promptService.BUTTON_DELAY_ENABLE;
	else if (DLWindowSuppressCloseConfirm.value) return;

	var check = {value:DLWindowSuppressCloseConfirm.value};

	var ConfirmClose = promptService.confirmEx(
		null,
		null,
		ihg_Globals.strings.close_confirm_progress_window([document.title]),
		buttonflag,
		null, null, null,																				// default button labels
		ihg_Globals.strings.dont_bother_close_confirm,													// Checkbox label "Stop bothering me with confirm message !"
		check);																							// Checkbox value; CANCEL=return(1)

	DLWindowSuppressCloseConfirm.value = check.value;

	switch (ConfirmClose) {
		case 0:	killme();
				if (saveSession() == true) return;
		case 1:	event.stopPropagation();
				event.preventDefault();
		case 2:
		default:return;
		}
	}


function onUnLoad() {
	killme();
	var boolAutoSave = document.getElementById("cbAutoSaveSession");
	if (boolAutoSave.checked)
		saveSession("dlwin_exit_state");
	}


function saveSession(fileName) {
	if (typeof req_objs === "undefined" || req_objs.length == 0) return;

	var cacheDir = Components.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get("ProfD", Components.interfaces.nsIFile);
	cacheDir.append("ihg_cache");
	if (!cacheDir.exists() || !cacheDir.isDirectory()) { 
		cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);  
		}

	var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	aLocalFile.initWithPath(cacheDir.path);

	if (fileName) {
		aLocalFile.append(fileName);
		var cacheFile = new ihg_Functions.dlWinCacheService(aLocalFile.path);
		cacheFile.writeCache(req_objs);
		return;
		}

	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, null, nsIFilePicker.modeSave);
	fp.displayDirectory = cacheDir;

	// We suggest a filename (different from the filenames of the existing files)
	var baseName = "dlwin_cache_";
	var postfix = 1;
	aLocalFile.append(baseName + postfix);

	while (aLocalFile.exists()) {
		postfix++;
		aLocalFile.initWithPath(cacheDir.path);
		aLocalFile.append(baseName + postfix);
		}
	fp.defaultString = baseName + postfix;

	var rv = fp.show();

	if (rv == nsIFilePicker.returnCancel) return false;

	var cacheFile = new ihg_Functions.dlWinCacheService(fp.file.path);
	cacheFile.writeCache(req_objs);
	return true;
	}


function loadSession() {
	var tReqs = ihg_Functions.getDLCache();
	if (tReqs == null) return;

	ihg_Functions.initVars(true); // true to suppress directory selection dialog

	if (!this.req_objs) {
		this.req_objs = tReqs;
		}
	else {
		var new_array = this.req_objs.concat(tReqs);
		for (var i = 0; i < new_array.length; i++) new_array[new_array[i].uniqID] = new_array[i];
		delete this.req_objs;
		this.req_objs = new_array;
		setUpLinkedList();
		}

	ihg_Functions.addDownloadReqObjs(tReqs);
	}


function exportSession() {
	if (ihg_Globals.lastSessionDir) {
		var cacheDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		cacheDir.initWithPath(ihg_Globals.lastSessionDir);
		}
	else {
		var cacheDir = Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties)
						.get("ProfD", Components.interfaces.nsIFile);
		cacheDir.append("ihg_cache");
		if (!cacheDir.exists() || !cacheDir.isDirectory())
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
		}

	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, null, nsIFilePicker.modeOpen);
	fp.displayDirectory = cacheDir;

	var rv = fp.show();
	if (rv == nsIFilePicker.returnCancel) return null;

	var copyToDir = ihg_Functions.setDownloadDir(ihg_Globals.strings.pick_folder_to_copy_session, null);

	if (!copyToDir) return;

	var newDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	newDir.initWithPath(copyToDir);

	try {
		fp.file.copyTo(newDir, null);
		}
	catch(e) {
		promptService.alert(null, null, ihg_Globals.strings.failed_to_copy_session);
		return;
		}

	promptService.alert(null, null, ihg_Globals.strings.session_file_sucessfully_copied);
	}


function reInitSession() {
	}


function getTreeSelection() {
	var tree = document.getElementById("igTree");

	var start = new Object();
	var end = new Object();
	var numRanges = tree.view.selection.getRangeCount();

	var daNodes = new Array();

	for (var t = 0; t < numRanges; t++) {
		tree.view.selection.getRangeAt(t,start,end);
		for (var v = start.value; v <= end.value; v++) daNodes.push(tree.view.getItemAtIndex(v));
		}

	return daNodes;
	}


function reset_retryCount() {
	var maxRetries = ihg_Globals.prefManager.getIntPref("extensions.imagegrabber.numretries");

	var daNodes = getTreeSelection();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		req_objs[idx].retryNum = maxRetries;
		}
	}


function restart_child() {
	var maxRetries = ihg_Globals.prefManager.getIntPref("extensions.imagegrabber.numretries");

	var daNodes = getTreeSelection();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		req_objs[idx].reqURL = req_objs[idx].origURL;
		req_objs[idx].curProgress = 0;
		req_objs[idx].maxProgress = 0;
		req_objs[idx].retryNum = maxRetries;
		req_objs[idx].overwrite = true;
		req_objs[idx].override_stop = true;
		req_objs[idx].retry();
		}
	}


function remove_child(back_space) {
	var tree = document.getElementById("igTree");
	var currentNode = tree.view.getItemAtIndex(tree.view.selection.currentIndex);

	var daNodes = getTreeSelection();

	var removeList = new Array();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		if (idx == currentNode.id)
			try {
				tree.view.selection.select(tree.view.selection.currentIndex + (back_space ? -1 : +1));
				currentNode = tree.view.getItemAtIndex(tree.view.selection.currentIndex);
				}
			catch (e) {}
		if (req_objs[idx].inprogress) req_objs[idx].abort();
		var parentItem = daNodes[s].parentNode;
		parentItem.removeChild(daNodes[s]);

		var containerItem = parentItem.parentNode;
		if (containerItem.getAttribute("container")) {
			if (!parentItem.hasChildNodes()) {
				setTimeout(ihg_Functions.clearFromWin, 1000, containerItem.id, true);
				}
			}

		removeList.push(idx);
		}

	delete_from_req_objs(removeList);
	}


function abort_child() {
	var daNodes = getTreeSelection();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		req_objs[idx].abort();
		}

	}


function retry_child() {
	var daNodes = getTreeSelection();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		req_objs[idx].retryNum++;
		req_objs[idx].overwrite = true;
		req_objs[idx].override_stop = true;
		req_objs[idx].retry();
		}
	}


function autoClearForm() {
	var autoClear = document.getElementById("cbAutoClear").checked;

	if (autoClear) clear_form();
	}


function clear_form() {
	if (typeof req_objs === "undefined" || req_objs.length == 0) return;

	var outBox = document.getElementById("outBox");
	var removeList = new Array();

	for (var i = 0; i < req_objs.length; i++) {
		try {
			var daNode = document.getElementById(req_objs[i].uniqID);
			var someShit = daNode.nodeName;
			}
		catch(e) { continue; }


		// Be cautious in performing this sort of conditional testing, as this assumes
		// that req_objs[i].inprogress (and others) will always exist, and will always
		// have a value of true or false.  If, for some reason, req_objs[i].inprogress
		// (or others) got deleted, then "if (req_objs[i].inprogress)" will return
		// false.  Likewise, if req_objs[i].inprogress is declared, but contains no
		// value, then "if (req_objs[i].inprogress)" will return true.  This may give
		// unintended results.
		//
		// This sort of conditional testing should be used to check the existence of
		// a variable, and not for checking the value of the variable.  Although
		// JavaScript is smart enough to check the values of the variables, it is
		// considered sloppy, since it can produce un-intended results.
		//
		// To ensure the intended conditions are tested, use:
		//		if (req_objs[i].inprogress == false && req_objs[i].finished == true && req_objs[i].aborted == false) {
		if (!req_objs[i].inprogress && req_objs[i].finished && !req_objs[i].aborted) {
			var parentItem = daNode.parentNode;
			parentItem.removeChild(daNode);

			var containerItem = parentItem.parentNode;
			if (containerItem.getAttribute("container")) {
				if (!parentItem.hasChildNodes()) {
					setTimeout(ihg_Functions.clearFromWin, 1000, containerItem.id, true);
					}
				}
			removeList.push(req_objs[i].uniqID);
			}
		}

	delete_from_req_objs(removeList);
	}


function delete_from_req_objs(removeList) {
	try {
		for (var i = removeList.length - 1; i >= 0; i--) {
			var reqChild = req_objs[removeList[i]];
			var index = reqChild.index;
			delete req_objs[removeList[i]];
			req_objs.splice(index, 1);
			}

		setUpLinkedList();
		}
	catch(e) {}
	}


function killme() {
	ihg_Globals.prefManager.setBoolPref("extensions.imagegrabber.killmenow", true);

	if (typeof req_objs === "undefined" || req_objs.length == 0) return;

	var statLabel = document.getElementById("statLabel");
	statLabel.value = ihg_Globals.strings.stopping_the_program;

	for (var i = 0; i < req_objs.length; i++) {
		req_objs[i].override_stop = false;
		if (req_objs[i].inprogress) {
			req_objs[i].stopped = true;
			req_objs[i].abort();
			}
		}

	for (let hostID in req_objs[0].cp.hostTimer) {
		if (req_objs[0].cp.hostTimer[hostID] && req_objs[0].cp.hostTimer[hostID] != null)
			req_objs[0].cp.hostTimer[hostID].cancel();
		delete req_objs[0].cp.hostTimer[hostID];
		};
	}


function reviveme() {
	ihg_Globals.prefManager.setBoolPref("extensions.imagegrabber.killmenow", false);

	if (typeof req_objs === "undefined" || req_objs.length == 0) return;

	var statLabel = document.getElementById("statLabel");
	statLabel.value = ihg_Globals.strings.reviving_the_program;

	for (var i = 0; i < req_objs.length; i++) {
		if (req_objs[i].stopped) {
			req_objs[i].stopped = false;
			req_objs[i].finished = false;
			req_objs[i].aborted = false;
			}
		}

	req_objs[0].queueHandler();
	}


function view_details() {
	var igTree = document.getElementById("igTree");
	var idx = igTree.view.selection.currentIndex;
	if (idx == -1) return;
	var daNode = igTree.view.getItemAtIndex(idx);
	var shit = daNode.id;
	if (!shit.match(/^req_/)) return;

	var detail_win_obj = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
	var detail_win = detail_win_obj.getWindowByName("ig-detail_win", null);

	if (!detail_win) {
		detail_win = detail_win_obj.openWindow(null, "chrome://imagegrabber/content/interfaces/req_details.xul", "ig-detail_win", "resizable,scrollbars=yes", null);
		detail_win.reqObj = req_objs[shit];
		// detail_win.addEventListener("load", rightOn, false);
		}
	else {
		detail_win.setReqObj(req_objs[shit]);
		// rightOn();
		detail_win.focus();
		}
	}


function rightOn() {
	var detail_win_obj = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
	var detail_win = detail_win_obj.getWindowByName("ig-detail_win", null);
	var reqObj = detail_win.reqObj;

	detail_win.document.getElementById("uniqID").value = reqObj.uniqID;
	detail_win.document.getElementById("pageNum").value = reqObj.pageNum;
	detail_win.document.getElementById("totLinkNum").value = reqObj.totLinkNum;
	detail_win.document.getElementById("curLinkNum").value = reqObj.curLinkNum;
	detail_win.document.getElementById("reqURL").value = reqObj.reqURL;
	detail_win.document.getElementById("originatingPage").value = reqObj.originatingPage;
	detail_win.document.getElementById("regexp").value = reqObj.regexp;
	detail_win.document.getElementById("dirSave").value = reqObj.dirSave;
	detail_win.document.getElementById("readyState").value = reqObj.xmlhttp.readyState;
	try {
		detail_win.document.getElementById("statusText").value = reqObj.xmlhttp.statusText;
		}
	catch(e) { }
	detail_win.document.getElementById("responseText").value = reqObj.xmlhttp.responseText;
	}


function launchFile() {	
	var igTree = document.getElementById("igTree");
	if (igTree.view.rowCount == 0) return;

	var idx = igTree.view.selection.currentIndex;
	var daNode = igTree.view.getItemAtIndex(idx);
	var shit = daNode.id;

	if (req_objs[shit].fileName == "") {
		promptService.alert(null, null, ihg_Globals.strings.no_file_to_open_yet);
		return;
		}

	var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	aLocalFile.initWithPath(req_objs[shit].dirSave);
	aLocalFile.append(req_objs[shit].fileName);

	aLocalFile.launch();
	}


function revealFile() {	
	var igTree = document.getElementById("igTree");
	if (igTree.view.rowCount == 0) return;

	var idx = igTree.view.selection.currentIndex;
	var daNode = igTree.view.getItemAtIndex(idx);
	var shit = daNode.id;

	var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	aLocalFile.initWithPath(req_objs[shit].dirSave);

	aLocalFile.reveal();
	}


function setUpLinkedList() {
	var lastObj = req_objs.length - 1;

	for (var i = 0; i < req_objs.length; i++) {
		if (i == 0) req_objs[i].previousRequest = null;
		else req_objs[i].previousRequest = req_objs[i-1];

		if (i == lastObj) req_objs[i].nextRequest = null;
		else req_objs[i].nextRequest = req_objs[i+1];

		req_objs[i].firstRequest = req_objs[0];
		req_objs[i].lastRequest = req_objs[lastObj];

		req_objs[i].index = i;
		}
	}


function openReqUrls() {
	var daNodes = getTreeSelection();

	for (var s = 0; s < daNodes.length; s++) {
		var idx = daNodes[s].id;
		if (!idx.match(/^req_/)) continue;
		var reqUrl = req_objs[idx].reqURL;
		if (!nWin) {
			var nWin = window.open(reqUrl,reqUrl,"menubar,toolbar,location,resizable,scrollbars,status=yes");
			}
		else {
			var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('navigator:browser');
			win.gBrowser.addTab(reqUrl);
			}
		}
	}


function doSelectAll() {
	var tree = document.getElementById("igTree");
	tree.view.selection.selectAll();
	}


function doInvertSelection() {
	var tree = document.getElementById("igTree");
	var idx = tree.view.selection.currentIndex;

	//I can't make this working, don't know why...
	//tree.view.selection.invertSelection();
	//Firefox shows this error: NS_ERROR_NOT_IMPLEMENTED
	//This code should be equivalent:
	for (var i = 0; i < tree.view.rowCount; i++) {
		tree.view.selection.toggleSelect(i);
		}

	tree.view.selection.currentIndex = idx;
	}


function setFocus() {
	var tree = document.getElementById("igTree");
	tree.focus();
	if (tree.view.rowCount > 0) tree.view.selection.select(0);
	}


function exportList() {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);	
	fp.init(this.window, null, nsIFilePicker.modeSave);
	fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterHTML);
	fp.filterIndex = 1;
	fp.defaultExtension = "html";

	var rv = fp.show();

	if (rv == nsIFilePicker.returnCancel) return;

	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
	foStream.init(fp.file, 0x02 | 0x08 | 0x20, 0664, 0); // write only | create | truncate

	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
	converter.init(foStream, "UTF-8", 0, 0);

	converter.writeString("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n"
	+ "<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"en\" lang=\"en\">\n"
	+ "<head>\n"
	+ "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n"
	+ "<title>Links</title>\n"
	+ "</head>\n"
	+ "<body>\n");

	var tree = document.getElementById("igTree");

	for (var i = 0; i < tree.view.rowCount; i++) {
		var daNode = tree.view.getItemAtIndex(i);
		if (!daNode.id.match(/^req_/)) {
			converter.writeString("<h3>" + daNode.firstChild.childNodes[1].getAttribute("label") + "</h3>\n");
			continue;
			}
		var reqUrl = req_objs[daNode.id].reqURL;
		reqUrl = reqUrl.replace(/&/g, "&amp;");
		if (req_objs[daNode.id].regexp == "Embedded Image") converter.writeString("<img src=\"" + reqUrl + "\" alt=\"" + reqUrl+ "\" /><br />\n");
		else converter.writeString(reqUrl.link(reqUrl) + "<br />\n");
		}

	converter.writeString("</body>\n"
	+ "</html>\n");
	converter.close();
	}