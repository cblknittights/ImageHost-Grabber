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

var threadsucker_Globals = new Object();

threadsucker_Globals.threadURL = null;
threadsucker_Globals.curReqNum = null;
threadsucker_Globals.curForumPage = null;
threadsucker_Globals.linkIndex = null;
threadsucker_Globals.tmpDocLinks = null;
threadsucker_Globals.useCacheIfAvail = null;
threadsucker_Globals.cacheThang = null;

threadsucker_Globals.doc_req = null;


////////////////////////////  The main function //////////////////////////

ihg_Functions.leechThread = function leechThread(activeElement) {
	if (activeElement) {
		if (!activeElement.href) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			promptService.alert(null, null, ihg_Globals.strings.need_to_right_click_on_link);
			throw "IHG: In leechThread, invalid activeElement passed to function.";
		}
		threadsucker_Globals.threadURL = activeElement.href;
	}
	else threadsucker_Globals.threadURL = content.document.URL;

	// ihg_Globals.Console.WriteLine("ThreadURL: " + threadsucker_Globals.threadURL);

	ihg_Globals.suckMode = true;

	threadsucker_Globals.useCacheIfAvail = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.cachethreadsuck");

	threadsucker_Globals.cacheThang = new Array();

	var continueOrNot = ihg_Functions.initVars();
	if (!continueOrNot) return;

	threadsucker_Globals.curReqNum = 0;
	threadsucker_Globals.curForumPage = ihg_Globals.firstPage;
	threadsucker_Globals.linkIndex = ihg_Globals.firstPage;
	threadsucker_Globals.tmpDocLinks = new Array();

	//threadsucker_Globals.threadURL = content.document.URL;

	threadsucker_Globals.doc_req = ihg_Functions.setUp_suckerReq();

	threadsucker_Globals.doc_req = ihg_Functions.setUp_suckerLinkedList(threadsucker_Globals.doc_req);


	var ig_dl_win_obj = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
	ig_dl_win = ig_dl_win_obj.getWindowByName("ig-dl_win", null);
	if (!ig_dl_win) {
		ig_dl_win = ig_dl_win_obj.openWindow(null, "chrome://imagegrabber/content/interfaces/downloads.xul", "ig-dl_win", "resizable,scrollbars=yes", null);
		ig_dl_win.onload = ihg_Functions.finishUp2;
		}
	else {
		ig_dl_win.focus();
		ihg_Functions.finishUp2();
		}
}//end of function

ihg_Functions.finishUp2 = function finishUp2() {
	ihg_Functions.updateDownloadStatus(ihg_Globals.strings.running);

	for (var i = 0; i < threadsucker_Globals.doc_req.length; i++) {
		var m = threadsucker_Globals.doc_req[i].curLinkNum + 1;
		var page_stat = ihg_Globals.strings.page + " " + threadsucker_Globals.doc_req[i].pageNum + ": " + m + " " + ihg_Globals.strings.of + " " + threadsucker_Globals.doc_req[i].totLinkNum;
		ihg_Functions.addDownloadProgress(page_stat, threadsucker_Globals.doc_req[i].uniqID, threadsucker_Globals.doc_req[i].reqURL, ihg_Globals.strings.waiting);
		}

	ihg_Functions.setFocus();

	if (threadsucker_Globals.doc_req.length == 0) {
		ihg_Functions.updateDownloadStatus(ihg_Globals.strings.dont_know_how + " " + threadsucker_Globals.threadURL);
		return;
		}

	threadsucker_Globals.doc_req[0].init();
	}



////////////////  The event function for xmlhttp //////////////////

ihg_Functions.getRDun = function getRDun() {
	var req = this.parent;
	req.callwrapper.cancel();

	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot) return;

	var ref_url = req.reqURL;
	var pageData = this.responseText;

	// ihg_Globals.Console.WriteLine("------------>\n\n" + pageData + "\n\n------------>");

	var pageNum = req.pageNum;

	if (ref_url.match(/campusbug/)) pageNum++;

	ihg_Functions.updateDownloadStatus(ihg_Globals.strings.getting_link_information + " " + pageNum);

	var tempLinks = ihg_Functions.getLinks(pageData);

	// add the ref_url to the end of the array so it can be used later
	tempLinks[tempLinks.length] = ref_url;
	for (var i=0; i < tempLinks.length; i++) {
		// Possibly add some code here to handle other javascript type links
		var jsWrappedUrl = tempLinks[i].match(/javascript.+(\'|\")(http.+?)\1/);
		if (jsWrappedUrl) tempLinks[i] = jsWrappedUrl[2];

		var isEmbedded = /^\[embeddedImg\]/.test(tempLinks[i]);
		if (isEmbedded) {
			tempLinks[i] = tempLinks[i].replace(/^\[embeddedImg\]/, "");
			}

		try {
			var someURI = ihg_Globals.ioService.newURI(tempLinks[i], null, null);
			}
		catch(e) {
			var someURI = ihg_Globals.ioService.newURI(ref_url, null, null);
			tempLinks[i] = someURI.resolve(tempLinks[i]);
			}

		if (isEmbedded) tempLinks[i] = "[embeddedImg]" + tempLinks[i];
		}

	threadsucker_Globals.tmpDocLinks[pageNum] = tempLinks;

	req.finished = true;
	req.inprogress = false;

	ihg_Functions.clearFromWin(req.uniqID, true);

	req.queueHandler();
}



ihg_Functions.setUp_suckerReq = function setUp_suckerReq() {
	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot) return;

	var forumStyleFileObj = new ihg_Functions.forumStyleFileService();
	var fsFile = forumStyleFileObj.getForumStyles();
	var forums = fsFile.getElementsByTagName("forum");

	var tempThing = null;

	for (var i = 0; i < forums.length; i++) {
		var uPatNode = forums[i].getElementsByTagName("urlpattern")[0];
		var uPat = new RegExp(uPatNode.textContent, "i");
		if (threadsucker_Globals.threadURL.match(uPat)) {
			var sPatNode = forums[i].getElementsByTagName("searchpattern")[0];
			tempThing = sPatNode.textContent;
			break;
			}
		}

	if (!tempThing) return; // It means we don't know how to handle this forum yet

	var cunt = tempThing.match(/function\((.+)\)/);
	var aa = tempThing.replace(/[\n\f\r]/g, 'NEWLINE');
	var bb = aa.match(/{(.+)}/)[1];
	var cc = bb.replace(/NEWLINE/g, '\n');

	var retval = new Function(cunt[1], cc);

	var count = 0;
	var temp_array = new Array();

	while (threadsucker_Globals.linkIndex <= ihg_Globals.lastPage) {
		var tmpURL = retval(threadsucker_Globals.threadURL);

		if (tmpURL == "continue") continue;
		if (!tmpURL){
			ihg_Functions.updateDownloadStatus(ihg_Globals.strings.dont_know_how + " " + threadsucker_Globals.threadURL + ihg_Globals.strings.bailing);
			return;
			}

		// ihg_Globals.Console.WriteLine("tmpURL: " + tmpURL);

		var req = new ihg_Classes.requestObj();

		req.hostFunc = ihg_Functions.getRDun;
		req.queueHandler = ihg_Functions.sucker_queueHandler;

		req.reqURL = tmpURL;
		req.retryNum = ihg_Globals.maxRetries;
		req.pageNum = threadsucker_Globals.linkIndex;
		req.curLinkNum = 0;
		req.totLinkNum = 1;

		temp_array[count] = req;
		temp_array[req.uniqID] = temp_array[count];
		count++;
		threadsucker_Globals.linkIndex++;
		} // end of inner-for loop

	return temp_array;
	} // end of function






ihg_Functions.setUp_suckerLinkedList = function setUp_suckerLinkedList(req_objs) {
	var lastObj = req_objs.length - 1;

	for(var i = 0; i < req_objs.length; i++) {
		if (i == 0) req_objs[i].previousRequest = null;
		else req_objs[i].previousRequest = req_objs[i-1];

		if (i == lastObj) req_objs[i].nextRequest = null;
		else req_objs[i].nextRequest = req_objs[i+1];

		req_objs[i].firstRequest = req_objs[0];
		req_objs[i].lastRequest = req_objs[lastObj];
		}

	return req_objs;
	}



ihg_Functions.sucker_queueHandler = function sucker_queueHandler() {
	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot) return;

	this.cp.curThread = this.countThreads();
	//this.cp.curThread--;

	var next_req = this.firstRequest.getNextAvailable();

	if (next_req) {
		next_req.init();
		}
	else {
		ihg_Functions.hostGrabber(threadsucker_Globals.tmpDocLinks, false);
		}
	}