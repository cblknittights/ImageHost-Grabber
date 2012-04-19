/****************************** Start of GPL Block ****************************
 *   ImageHost Grabber - Imagegrabber is a firefox extension designed to 
 *   download pictures from image hosts such as imagevenue, imagebeaver, and 
 *   others (see help file for a full list of supported hosts).
 *
 *   Copyright (C) 2007   Matthew McMullen.
 * 
 *   This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 2 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program; if not, write to the Free Software
 *   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 ***************************  End of GPL Block *******************************/


/* requestObj class:  It's necessary to  create a class that encompasses the XMLHttpRequest
 * class.  Each new instance of requestObj will create a new instance of XMLHttpRequest.
 * What this does is it allows the XMLHttpRequest object to access data that is not part
 * of the XMLHttpRequest class definition.  The difference between this and adding a property
 * or member on the fly (i.e. object.whatever = somestuff), is that the data is guaranteed to 
 * be accessible using this technique.  Whereas, when adding members on the fly, XMLHttpRequest
 * had a bad tendency of losing the data that was assigned to it on the fly.
 */
ihg_Functions.requestObj = function requestObj() {
	this.uniqID = "req_" + (Math.floor(1e9 * (1 + Math.random()))).toString().substring(1);
	// These are the properties that need to be set (by someone) for each instance of the class
	this.origURL = "";
	this.reqURL = "";
	this.hostFunc = new Function();
	this.hostID = null;
	this.maxThreads = 0;
	this.downloadTimeout = 0;
	this.regexp = null;
	this.retryNum = 0;
	this.dirSave = "";
	this.fileName = "";
	this.baseFileName = "";
	this.pageNum = 0;
	this.totLinkNum = 0;
	this.curLinkNum = 0;
	this.uniqFN_prefix = "";
	this.status = "";
	this.originatingPage = "";
	this.referer = "";
	this.minFileSize = 0;

	// everything else below is blah blah blah
	this.callwrapper = new Object();

	this.cp = this.constructor.prototype; // make a convenient shortcut to the prototype

	this.finished = false;
	this.inprogress = false;
	this.curProgress = 0;
	this.maxProgress = 0;
	this.aborted = false;
	this.overwrite = false;
	this.override_stop = false;
	this.stopped = false;
	this.retried = false;
	this.notResumable = false;
	
	// A host is "locked" when the host has a "Timeout" attribute and is waiting to
	// start the next download or set of downloads.
	//
	// Syntax: reqObj.cp.hostLocked[hostID] = true
	this.cp.hostLocked = new Object();
	
	// Each locked host has a corresponding timer.  It should be set at the end of
	// the first to finish in a download set, and cleared at the end of the timeout period.
	this.cp.hostTimer = new Object();

	this.nextRequest = new Object();
	this.previousRequest = new Object();
	this.firstRequest = new Object();
	this.lastRequest = new Object();

	this.progListener = new Object();

	this.xmlhttp = null;
	}


ihg_Functions.requestObj.prototype = {
	curThread : 0,
	
	curHostThread : 0,
	
	constructor : ihg_Functions.requestObj,

	debugLog : function req_debugLog () {
		if (!ihg_Globals.debugOut) return;

		function var_out(a,b,c) { 
			ihg_Functions.LOG("In requestObj with uniqID of " + this.uniqID +
			    ", Property: " + a + ", Old Val: " + b + ", New Val: " + c + "\n");
			return c;
			}
		this.watch('reqURL', var_out);
		this.watch('retryNum', var_out);
		this.watch('curLinkNum', var_out);
		this.watch('finished', var_out);
		this.watch('inprogress', var_out);
		},

	abort : function req_abort(additional_message) {
		var retryURL = this.reqURL;

		if (this.finished) return;

		ihg_Functions.updateDownloadProgress(null, this.uniqID, null, null, ihg_Globals.strings.request_aborted + "  " + (additional_message?additional_message:""));
		ihg_Functions.LOG(retryURL + " has been aborted.\n");

		this.inprogress = false;
		this.finished = true;
		this.aborted = true;
		try {
			this.callwrapper.cancel();
			}
		catch(e) { }
		if (this.xmlhttp) this.xmlhttp.abort();

		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot) {
			ihg_Functions.LOG("In function requestObj.abort, received the call to die!\n");
			return; }

		this.queueHandler();
		},


	retry : function req_retry() {
		ihg_Functions.LOG("Entering function requestObj.retry\n");

		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot && !this.override_stop) {
			ihg_Functions.LOG("In function requestObj.retry, received the call to die!\n");
			return; }

		this.inprogress = false;
		var retryURL = this.reqURL;
		ihg_Functions.LOG("In function requestObj.retry, this.retryNum is equal to: " + this.retryNum + "\n");

		if (this.retryNum < 1) {
			ihg_Functions.updateDownloadProgress(null, this.uniqID, null, null, ihg_Globals.strings.request_failed);
			ihg_Functions.LOG(this.uniqID + " has been retried the maximum number of times... we're gonna give up.\n");

			this.finished = true;
			this.aborted = true;

			this.queueHandler();
			return;
			}

		this.finished = false;
		this.aborted = false;

		ihg_Functions.LOG("In function req_retry, fixing to execute xmlhttp.abort\n");		
		if (this.xmlhttp) this.xmlhttp.abort();

		this.retryNum--;

		var retry_dick = "(" + String(ihg_Globals.maxRetries - this.retryNum) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";
		ihg_Functions.updateDownloadProgress(null, this.uniqID, this.reqURL, null, ihg_Globals.strings.restarting_http + retry_dick);

		this.retried = true;
		this.init();

		ihg_Functions.LOG("Exiting function requestObj.retry\n");
		},

	requeue : function req_requeue(newPageUrl) {
		ihg_Functions.LOG("Entering function requestObj.requeue\n");

		var newHostToUse = ihg_Functions.getHostToUse(newPageUrl);
		if (!newHostToUse) {
			this.abort(ihg_Globals.strings.cant_find_new_host);
			return;
			}

		this.regexp = newHostToUse.hostFunc;

		this.reqURL = newPageUrl;
		this.retryNum++;

		this.retry();

		ihg_Functions.LOG("Exiting function requestObj.requeue\n");
		return;
		},

	unlock : function req_unlock() {
		ihg_Functions.LOG("Entering function requestObj.unlock\n");

		ihg_Functions.clearFromWin(this.uniqID);
		this.inprogress = false;
		
		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot) {
			ihg_Functions.LOG("In function requestObj.unlock, received the call to die!\n");
			return; }

		this.queueHandler();
		},

	clearHostTimer : function req_clearHostTimer() {
		if (this.cp.hostTimer["global"] != null) {
			this.cp.hostTimer["global"] = null;
			this.cp.hostLocked["global"] = false;
			}
		else {
			this.cp.hostTimer[this.hostID] = null;
			this.cp.hostLocked[this.hostID] = false;
			}
		
		this.queueHandler();
		},
	
	errHandler : function req_errHandler(event) {
		ihg_Functions.LOG("Entering function requestObj.errHandler\n");

		req = this.parent;
		var retryURL = req.reqURL;

		req.inprogress = false;

		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot) {
			ihg_Functions.LOG("In function requestObj.retry, received the call to die!\n");
			return; }

		req.callwrapper.cancel();

		if (req.retryNum < 1) {
			ihg_Functions.updateDownloadProgress(null, req.uniqID, null, null, ihg_Globals.strings.request_failed);
			ihg_Functions.LOG(retryURL + " has been retried the maximum number of times... we're gonna give up.\n");

			req.finished = true;
			req.aborted = true;

			req.queueHandler();
			return;
			}

		req.finished = false;
		req.aborted = false;

		req.retryNum--;

		ihg_Functions.LOG(retryURL + " has encountered an error.  Retrying.\n");
		var retry_dick = "(" + String(ihg_Globals.maxRetries - req.retryNum) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";
		ihg_Functions.updateDownloadProgress(null, req.uniqID, null, null, ihg_Globals.strings.error_in_request + " " + retry_dick);

		// Using the old XMLHttpRequest again does not seem to work properly, so we have to create a new one
		req.xmlhttp = new XMLHttpRequest();
		req.xmlhttp.parent = req;

		req.retried = true;
		req.init();

		ihg_Functions.LOG("Exiting function requestObj.errHandler\n");
		},


	getNextAvailable : function req_getNextAvailable() {
		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		
		var next_obj = this;
		while (next_obj) {
			if (!(next_obj.inprogress || next_obj.finished)) {
				if (!toDieOrNot) break;
				if (next_obj.override_stop) break;
				}
			
			next_obj = next_obj.nextRequest;
			}
		return next_obj;
		},

	queueHandler : function req_queueHandler() {
		//The next line and the loop allow for on-the-fly adaptation
		ihg_Globals.maxThreads = ihg_Globals.prefManager.getIntPref("extensions.imagegrabber.maxthreads");
		
		var next_req = this.firstRequest.getNextAvailable();
		if (next_req) {
			while (next_req) {
				if (this.countThreads() < ihg_Globals.maxThreads) {
					next_req.init();
					
					next_req = next_req.nextRequest;
					if (next_req) next_req = next_req.getNextAvailable();
					}
				else break;
				}
			}
		else {
			if (this.countThreads() == 0) {

				var listener = {
					observe: function(subject, topic, data) {
						switch(topic) {
							case "alertclickcallback":
								var ig_dl_win_obj = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
								ig_dl_win = ig_dl_win_obj.getWindowByName("ig-dl_win", null);
								ig_dl_win.focus();
								break;
							case "alertfinished":
								ihg_Globals.autoCloseWindow = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.autoclosewindow");
								if (ihg_Globals.autoCloseWindow) ihg_Functions.startCloseCountdown();
							default:break;
							}
						}
					}

				ihg_Functions.updateDownloadStatus(ihg_Globals.strings.all_done);
				ihg_Functions.AlertPopup('Download Progress', 'Status: ' + ihg_Globals.strings.all_done, listener, true);
				}
			}
		},

	countThreads : function req_countThreads() {
		var numThreads = 0;
		var numHostThreads = 0;
		
		var nextReq = this.firstRequest;
		while (nextReq) {
			if (nextReq.inprogress) {
				if (!nextReq.finished) numThreads++;
				if (nextReq.hostID == this.hostID) numHostThreads++;
				}
			nextReq = nextReq.nextRequest;
			}
			
		this.cp.curThread = numThreads;
		this.cp.curHostThread = numHostThreads;
		
		return numThreads;
		},

	init : function req_init() {
		ihg_Functions.LOG("Entering function requestObj.init with uniqID of: " + this.uniqID + "\n");

		if (this.countThreads() >= ihg_Globals.maxThreads) {
			ihg_Functions.LOG("In function requestObj.init with uniqID of: " + this.uniqID + ", curThread >= ihg_Globals.maxThreads (" + ihg_Globals.maxThreads + ")\n");
			return;
			}

		if (this.maxThreads > 0 && this.cp.curHostThread >= this.maxThreads) {
			ihg_Functions.LOG("In function requestObj.init with uniqID of: " + this.uniqID + ", curHostThread >= maxHostThreads (" + this.maxThreads + ")\n");
			return;
			}

		if (this.cp.hostLocked["global"] == true) return;
		if (this.cp.hostLocked[this.hostID] == true) return;
		
		if (this.finished || this.inprogress) {
			ihg_Functions.LOG("In function requestObj.init with uniqID of: " + this.uniqID + 
			    "\nfinished: " + this.finished + ", inprogress: " + this.inprogress + "\n");
			return;
			}

		this.inprogress = true;

		if (!this.retried) {
			ihg_Functions.updateDownloadProgress(null, this.uniqID, this.reqURL, null, ihg_Globals.strings.starting_http);
		
			//These two lines allow for on-the-fly adaptation
			ihg_Globals.maxRetries = ihg_Globals.prefManager.getIntPref("extensions.imagegrabber.numretries");
			this.retryNum = ihg_Globals.maxRetries;
		}

		if (!this.xmlhttp) {
			this.xmlhttp = new XMLHttpRequest();
			this.xmlhttp.parent = this;
		}

		if (typeof(this.regexp) == "string" && this.regexp.search(/^REPLACE: ["']/) >= 0)
			this.xmlhttp.open("GET", encodeURI('about:blank'), true);
		else
			this.xmlhttp.open("GET", this.reqURL, true);
		if (this.referer) this.xmlhttp.setRequestHeader("Referer", this.referer);
		this.xmlhttp.onreadystatechange = this.init2;
		this.xmlhttp.onload = this.hostFunc;
		this.xmlhttp.onerror = this.errHandler;
		this.xmlhttp.send(null);

		var req_timeout = ihg_Globals.reqTimeout;  // timeout is in milliseconds

		this.callwrapper = new ihg_Functions.CCallWrapper(this, req_timeout, 'retry', this.uniqID);
		ihg_Functions.CCallWrapper.asyncExecute(this.callwrapper);

		ihg_Functions.LOG("Exiting function requestObj.init with uniqID of:" + this.uniqID + "\n");
		},

	init2 : function req_init2() {
		var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
		ihg_Functions.LOG("Entering " + myself + "\n");

		var req = this.parent;

		ihg_Functions.LOG("In " + myself + ", this.readyState: " + this.readyState + "\n");

		if (this.readyState == 2) {
			if (this.status >= 400 && this.status < 500) {
				req.abort(ihg_Globals.strbundle.getFormattedString("http_status_code", [this.status]));
				return;
				}
	
			var contType = this.getResponseHeader("Content-type");
			if (!contType) return;
			if (contType.match(/image\/.+/)) {
				if (req.minFileSize > 0) {
					if (typeof(req.regexp) == "string" && req.regexp.match(/Embedded Image/)) {
						var contLength = this.getResponseHeader("Content-Length");
						if (contLength && contLength < req.minFileSize) { 
							// req.abort(document.getElementById("imagegrabber-strings").getFormattedString("file_too_short", [req.minFileSize/1024]));
							// setTimeout(function(){ ihg_Functions.clearFromWin(req.uniqID, true); }, 1000);
							req.abort(ihg_Globals.strbundle.getFormattedString("file_too_short", [req.minFileSize/1024]));
							setTimeout('ihg_Functions.clearFromWin("' + req.uniqID + '", true)', 1000);
							return;
							}
						}
					}
					
				this.onload = null;
				req.callwrapper.cancel();
				this.abort();
				ihg_Functions.doStartDownload(req, req.reqURL);
				ihg_Functions.updateDownloadProgress(null, req.uniqID, req.reqURL, null, ihg_Globals.strings.starting_download);
				return;
				}
			}
		}

	} // end of class prototype
