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


/* ihg_ProgressListener class:  This is the stream listener class for the channels used to download
* our files.  It is primarily responsible for sending the downloaded chunks to the corresponding
* files as the data becomes availble.  Also, It is primarily responsible for monitoring the status 
* and progress of our downloads.
* 
* aBuffer is a buffered output stream to the corresponding file.  It should be an implementation
* nsIBufferedOutputStream class.
*/

// For an example of how a stream/progress listener should be set up for typical
// http connections, check out: 
// https://developer.mozilla.org/En/Creating_Sandboxed_HTTP_Connections

ihg_Functions.ihg_ProgressListener = function ihg_ProgressListener() {
	this.buffer = new Object();

	this.refURL = "";
	this.reqObj = new Object();
	this.aFile = new Object();

	this.fileGood = "";
	this.fileContents = "";

	this.bis = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);

	this.resumable = true;

	this.request = new Object();
}

ihg_Functions.ihg_ProgressListener.prototype = {
	checkFile : function() {
		var fileURI = ihg_Globals.ioService.newFileURI(this.aFile);
		var channel = ihg_Globals.ioService.newChannelFromURI(fileURI);

		var stream = channel.open();

		try {
			var count = stream.available();
			this.bis.setInputStream(stream);
			var shitty = this.bis.readBytes(count);			

			this.fileContents = shitty;

			// For jpegs, the first two bytes are the start of image (SOI) marker.
			// the SOI marker is FFD8
			if (shitty.search(/^\xFF\xD8/) >= 0) this.fileGood = "yes";
			// For pngs, the first four bytes are 8950 4E47
			else if (shitty.search(/^\x89\x50\x4E\x47/) >= 0) this.fileGood = "yes";
			// For bmps, the first two bytes are 424D
			else if (shitty.search(/^\x42\x4D/) >= 0) this.fileGood = "yes";
			// For gifs, the first six bytes are 4749 4638 3761 or 4749 4638 3961
			// Who in their right mind would be downloading gifs?
			else if (shitty.search(/^\x47\x49\x46\x38(?:\x37|\x39)\x61/) >= 0) this.fileGood = "yes";
			// For flvs, the first three bytes are 464C56 (FLV)
			else if (shitty.search(/^\x46\x4C\x56/) >= 0) this.fileGood = "yes";
			// For icon files, the first four bytes are 0000 0100
			// Bah humbugs!  Fuck icon files!
			else if (shitty.search(/^\x00\x00\x01\x00/) >= 0) this.fileGood = "yes";
			// For swf's, the first three bytes are 435753 (CWS) or 465753 (FWS)
			else if (shitty.search(/^(?:\x43|\x46)\x57\x53/) >= 0) this.fileGood = "yes";
			// Support for MP4 files
			else if (shitty.search(/^\x00{3}\x1c\x66\x74\x79\x70(?:\x6D\x70\x34\x32|\x33\x67\x70\x35|\x69\x73\x6F\x6D|\x46\x41\x43\x45)/) >= 0) this.fileGood = "yes";
			
			else this.fileGood = "no";
		}
		catch(e) { this.fileGood = "yes"; }

		stream.close();
	},

	// nsIInterfaceRequestor
	getInterface : function (aIID) {
		try {
			return this.QueryInterface(aIID);
		}
		catch (e) {
			throw Components.results.NS_NOINTERFACE;
		}
	},

	retry : function() {

		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot && !this.override_stop) {
			ihg_Functions.LOG("In function requestObj.retry, received the call to die!\n");
			return; }
		this.request.cancel(Components.results.NS_OK);
	},

	onStartRequest : function(request, context){

		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot && !this.reqObj.override_stop) return;
		if (this.reqObj.aborted) return;

		if (request.status == Components.results.NS_ERROR_NOT_RESUMABLE) this.resumable = false;
		else if (request.status == Components.results.NS_ERROR_CONNECTION_REFUSED) {
			// This happens sometimes when downloading images from imagebam.
			// Filename is not available when this happens, so we need
			// to retry the download in order to get the correct filename
			// and not to create an additional file that is empty
			return;
		}

		if (this.aFile != null) {
			if (!this.reqObj.fileName) {
				var newFileName  = ihg_Functions.getFNameFromHeader(this.reqObj, request);
				if (newFileName) {
					this.aFile.leafName = newFileName;
					this.reqObj.overwrite = false;
				}
			}

			var resumeDownload = this.reqObj.curProgress > 0 && this.reqObj.maxProgress > 0;

			if (ihg_Globals.fileExistsBehavior == "skip" && this.aFile.exists() 
					&& !this.reqObj.overwrite && !resumeDownload) {
				request.cancel(Components.results.NS_OK);
				ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, this.aFile.leafName, 100, ihg_Globals.strings.file_already_exists);
				ihg_Functions.LOG("File " + this.aFile.path + " already exists. Skipping....\n");
				return;
			}


			if (ihg_Globals.fileExistsBehavior == "rename" && !this.reqObj.overwrite && !resumeDownload) {
				// This causes files to not overwrite themselves.  It's good... trust me
				var postfix = 0;
				var tmpDispName = "";
				var displayName = this.aFile.leafName;

				while (this.aFile.exists()) {
					postfix++;
					var strPostFix = postfix + "";
					while (strPostFix.length < 3) strPostFix = "0" + strPostFix;
					indxVal = displayName.lastIndexOf(".");
					tmpDispName = displayName.substr(0, indxVal) + "_" + strPostFix + displayName.substr(indxVal);
					ihg_Functions.LOG("tmpDispName is equal to: " + tmpDispName + "\n");

					this.aFile.leafName = tmpDispName;
				}
			}

			var os = Components.classes["@mozilla.org/network/file-output-stream;1"].
			createInstance(Components.interfaces.nsIFileOutputStream);

			if (resumeDownload) {
				try { os.init(this.aFile, 0x02 | 0x10, 0664, null); }
				catch(e) { os.init(this.aFile, 0x02 | 0x08 | 0x20, 0664, null); }
			}
			else
				os.init(this.aFile, 0x02 | 0x08 | 0x20, 0664, null);

			this.buffer = Components.classes["@mozilla.org/network/buffered-output-stream;1"].
			createInstance(Components.interfaces.nsIBufferedOutputStream);
			this.buffer.init(os, 8192);
		}
		else {
			// no output file -> terminate http request
			request.cancel(Components.results.NS_OK);
			return;
		}

		ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, this.aFile.leafName, null, ihg_Globals.strings.starting_download);
		this.reqObj.fileName = this.aFile.leafName;

		this.request = request;

		var req_timeout = ihg_Globals.reqTimeout;  // timeout is in milliseconds
		this.callwrapper = new ihg_Functions.CCallWrapper(this, req_timeout, 'retry', "download of " + this.reqObj.uniqID);
		ihg_Functions.CCallWrapper.asyncExecute(this.callwrapper);
	},

	onStopRequest : function(request, context){
		try { 
			this.buffer.close(); 
			this.callwrapper.cancel();
		}
		catch(e) { }


		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if (toDieOrNot && !this.reqObj.override_stop) return;
		if (this.reqObj.aborted) return;

		aStatus = request.status;

		if(aStatus == 0) 	{
			if (this.reqObj.curProgress < this.reqObj.maxProgress && this.reqObj.maxProgress != -1) {
				var retry_dick = "(" + String(ihg_Globals.maxRetries - this.reqObj.retryNum + 1) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";
				ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, null, ihg_Globals.strings.download_did_not_complete + " " + retry_dick)
				ihg_Functions.LOG("In onStopRequest, file did not download correctly, " + this.refURL + ", " + this.reqObj.uniqID + ", Retrying!\n");
				this.reqObj.overwrite = true;
				this.reqObj.retry();
				return;
			}

			this.checkFile();
			if(this.fileGood == "no") {
				if(this.fileContents.match(/Error: Unavailable/)) {
					ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, 100, ihg_Globals.strings.error_from_server);
				}
				else {
					var retry_dick = "(" + String(ihg_Globals.maxRetries - this.reqObj.retryNum + 1) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";
					ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, null, ihg_Globals.strings.file_not_good + " " + retry_dick)
					ihg_Functions.LOG("File did not download correctly, " + this.refURL + ", " + this.reqObj.uniqID + ", Retrying!");
					//this.reqObj.overwrite = true;
					this.aFile.remove(true);
					this.reqObj.curProgress = 0;
					this.reqObj.maxProgress = 0;
					this.reqObj.retry();
					return;
				}
			}
			else {
				ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, null, ihg_Globals.strings.finished);
			
				if (ihg_Globals.useLastModFromHeader) {
					try {
						var remoteLastModStr = request.getResponseHeader("Last-Modified");
						if (remoteLastModStr) {
							var remoteLastMod = new Date(remoteLastModStr);
							this.aFile.lastModifiedTime = remoteLastMod;
							}
						}
					catch (e) { /* Last-Modified not available */ }
				}
			}

			this.reqObj.finished = true;

			var hostID = this.reqObj.hostID;
			var hostLocked = this.reqObj.cp.hostLocked;
			var hostTimer = this.reqObj.cp.hostTimer;
			
			// Seeing as how there is an option for a host-specific downloadTimeout, then it stands to reason
			// that a global setting for downloadTimeout must mean that the user wants every download from
			// every host to have the limit, not just the ones that have maxThreads value.

			// if (download_timeout <= 0 || this.reqObj.maxThreads == 0) {
				// req_obj.unlock();
			// }

			
			if (ihg_Globals.downloadTimeout > 0) {
				if (this.reqObj.cp.hostTimer["global"] == null) {
					this.reqObj.cp.hostLocked["global"] = true;
					
					this.reqObj.cp.hostTimer["global"] = new ihg_Functions.CCallWrapper(this.reqObj, ihg_Globals.downloadTimeout, 'clearHostTimer', "locking of " + this.reqObj.uniqID);
					ihg_Functions.CCallWrapper.asyncExecute(this.reqObj.cp.hostTimer["global"]);
				}
				this.reqObj.unlock();	
			}
			else if (this.reqObj.downloadTimeout > 0) {
				// If the downloadTimeout is imposed from the host definition, then we should continue
				// checking for other hosts that are not limited by downloadTimeout.  Otherwise, all
				// downloads should be limited by downloadTimeout
				if (this.reqObj.cp.hostTimer[hostID] == null) {
					// We "lock" the host after the first completed download in a set of downloads.
					// This gives enough opportunity for either the global maxThreads to be met, or
					// for the host-specified maxThreads to be met, before locking the host.
					this.reqObj.cp.hostLocked[hostID] = true;
					
					this.reqObj.cp.hostTimer[hostID] = new ihg_Functions.CCallWrapper(this.reqObj, this.reqObj.downloadTimeout, 'clearHostTimer', "locking of " + this.reqObj.uniqID);
					ihg_Functions.CCallWrapper.asyncExecute(this.reqObj.cp.hostTimer[hostID]);
				}
				this.reqObj.unlock();
			}
			else this.reqObj.unlock();
		}

		if(aStatus != 0) {
			ihg_Functions.LOG("onStateChange has resulted in a non-successful status code inside of the persist progress listener.\n");
			ihg_Functions.LOG("In onStateChange, this.refURL is equal to" + this.refURL + "\n");
			ihg_Functions.LOG("In onStateChange, request.name is equal to " + request.name + "\n");
			ihg_Functions.LOG("In onStateChange, aStatus: " + aStatus + "\n");

			var retry_dick = "(" + String(ihg_Globals.maxRetries - this.reqObj.retryNum + 1) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";

			ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, null, ihg_Globals.strings.file_not_good + " " + retry_dick)
			if (aStatus == Components.results.NS_ERROR_NOT_RESUMABLE) {
				this.aFile.remove(true);
				this.reqObj.notResumable = true;
			}
			this.reqObj.overwrite = true;
			this.reqObj.curProgress = 0;
			this.reqObj.maxProgress = 0;
			this.reqObj.retry();
		}
	},

	// nsIChannelEventSink
	onChannelRedirect: function (aOldChannel, aNewChannel, aFlags) {
		ihg_Functions.LOG("Entered onChannelRedirect...\n");
	},

	// Requires Gecko 2.0
	asyncOnChannelRedirect: function (oldChannel, newChannel, flags, callback) {
		ihg_Functions.LOG("Entered asyncOnChannelRedirect...\n");

		this.onChannelRedirect(oldChannel, newChannel, flags);
		callback.onRedirectVerifyCallback(0);
		},

	onDataAvailable : function(request, context, stream, offset, count) { 
		this.reqObj.curProgress += count;

		try { 
			this.callwrapper.cancel();
			while(count > 0) count -= this.buffer.writeFrom(stream, count);
		}
		catch(e) { }


		var curProgress = this.reqObj.curProgress;
		var maxProgress = this.reqObj.maxProgress;


		var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
		if ((toDieOrNot && !this.reqObj.override_stop) || this.reqObj.aborted) {
			request.cancel(Components.results.NS_OK);
			try { this.buffer.close(); }
			catch(e) {}
			return;
		}

		ihg_Functions.updateDownloadProgress(null, this.reqObj.uniqID, null, (curProgress/maxProgress) * 100, ihg_Globals.strings.downloading + " " + curProgress + " " + ihg_Globals.strings.of + " " + maxProgress + "...");

		var req_timeout = ihg_Globals.reqTimeout;  // timeout is in milliseconds
		this.callwrapper = new ihg_Functions.CCallWrapper(this, req_timeout, 'retry', "download of " + this.reqObj.uniqID);
		ihg_Functions.CCallWrapper.asyncExecute(this.callwrapper);
	},

	// nsIProgressEventSink (not implementing will cause annoying exceptions)
	onProgress : function (aRequest, aContext, aProgress, aProgressMax) { 
		if (this.reqObj.maxProgress == 0) {
			this.reqObj.maxProgress = aProgressMax;
		}
		//if (this.reqObj.maxProgress == -1) this.request.cancel(Components.results.NS_ERROR_ABORT);
	},

	onStatus : function (aRequest, aContext, aStatus, aStatusArg) { },

	// nsIHttpEventSink (not implementing will cause annoying exceptions)
	onRedirect : function (aOldChannel, aNewChannel) { },

	// we are faking an XPCOM interface, so we need to implement QI
	QueryInterface : function(aIID) {
		if (aIID.equals(Components.interfaces.nsISupports) ||
				aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
				aIID.equals(Components.interfaces.nsIChannelEventSink) || 
				aIID.equals(Components.interfaces.nsIProgressEventSink) ||
				aIID.equals(Components.interfaces.nsIHttpEventSink) ||
				aIID.equals(Components.interfaces.nsIStreamListener)) return this;

		throw Components.results.NS_NOINTERFACE;
	}
}
