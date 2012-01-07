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





///////////////////////////////   Get the current page number //////////////////////////
ihg_Functions.getCurPageNum = function getCurPageNum() {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var getCurP;
	var doc = content.document;
	var classElems = doc.getElementsByTagName('td');
	
	for (var i=0; i < classElems.length; i++)
		{
		var tmpClass = classElems[i].getAttribute('class');
		if (tmpClass)
			{
			if (tmpClass.match(/vbmenu_control/))
				{
				var classHTML = classElems[i].innerHTML;
				if (classHTML.match(/Page [0-9]+ of [0-9]+/))
					{
					// The regexp remembers the first number and stores it
					// in the element 1 of the array
					getCurP = classHTML.match(/Page ([0-9]+) of [0-9]+/);
					}
				}
			}
		}
	ihg_Functions.LOG("In " + myself + ", getCurP is equal to: " + getCurP + "\n");
	if (!getCurP) return 1;
	return getCurP[1];
}




/////////////////  Gets the last page number ////////////////////////
ihg_Functions.getLastPageNum = function getLastPageNum() {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var getLastP;
	var doc = content.document;
	var classElems = doc.getElementsByTagName('td');
	
	for (var i=0; i < classElems.length; i++)
		{
		var tmpClass = classElems[i].getAttribute('class');
		if (tmpClass)
			{
			if (tmpClass.match(/vbmenu_control/))
				{
				var classHTML = classElems[i].innerHTML;
				if (classHTML.match(/Page [0-9]+ of [0-9]+/))
					{
					// The regexp remembers the search for the number in the parenthesis
					// and stores it in element 1 of the array
					getLastP = classHTML.match(/Page [0-9]+ of ([0-9]+)/);
					}
				}
			}
		}
	ihg_Functions.LOG("In " + myself + ", getLastP is equal to: " + getLastP + "\n");
	if (!getLastP) return 1;
	return getLastP[1];
}


ihg_Functions.getFormattedDate = function getFormattedDate() {
	var rightNow = new Date();
	var month = rightNow.getMonth().toString();
	var date = rightNow.getDate().toString();
	var hours = rightNow.getHours().toString();
	var minutes = rightNow.getMinutes().toString();
	var seconds = rightNow.getSeconds().toString();
	var milliseconds = rightNow.getMilliseconds().toString();

	if (month.length < 2) month = "0" + month;
	if (date.length < 2) date = "0" + date;
	if (hours.length < 2) hours = "0" + hours;
	if (minutes.length < 2) minutes = "0" + minutes;
	if (seconds.length < 2) seconds = "0" + seconds;
	while (milliseconds.length < 3) milliseconds = "0" + milliseconds;

	var someString = month + date + hours + minutes + seconds + milliseconds;

	return someString;
	}


ihg_Functions.setDownloadDir = function setDownloadDir(FpTitle, initDir) {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

	if(fp==null) {
		ihg_Functions.LOG("In " + myself + ", nsIFilePicker failed to instantiate.\n");
		return false;
		}

	try {
		if (!FpTitle) var FpTitle = ihg_Globals.strings.pick_download_folder;
		
		try {
			if (initDir) {
				ihg_Functions.LOG("In " + myself + ", initDir is equal to: " + initDir + "\n");
				var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				aLocalFile.initWithPath(initDir);
				fp.displayDirectory = aLocalFile;
				}
			}
		catch(ex) { ihg_Functions.LOG("In " + myself + ", could not initialize with a directory\n"); }

		fp.init(top.window, FpTitle, nsIFilePicker.modeGetFolder);
  		var res = fp.show();
		if (res == nsIFilePicker.returnOK) {
  			if (fp.file && (fp.file.path.length > 0)) return fp.file.path;
    			}
		return false;
  		}

  	catch(ex) {
		ihg_Functions.LOG("In " + myself + ", caught exception: " + ex + "\n");
   		return false;
  		}
	} 





ihg_Functions.generateFName = function generateFName(reqObj, URLFile) { 
	var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var desiredFName = reqObj.baseFileName;

	// Check to make sure the URLFile is a valid link
	try {
		var pic_uri = ihg_Globals.ioService.newURI(URLFile, null, null);
		var pic_url = pic_uri.QueryInterface(Components.interfaces.nsIURL);
		}
	catch(e) {
		ihg_Functions.LOG("In " + myself + ", an invalid URL was given: " + URLFile + "\n");
		return null;
		}	

	// if a desired filename is given, use it
	if (desiredFName) var displayName = desiredFName;
	// otherwise, use the filename from URLFile
	else {
		// Check to make sure URLFile contains a file
		if (!pic_url.fileName) {
			ihg_Functions.LOG("In " + myself + ", no file found in URL: " + URLFile + "\n");
			return null;
			}

		// If the picture URL is actually a script with some extra stuff at
		// the end (that stuff should uniquely identify the image, hopefully)
		// then we'll use the extra stuff as identifying data for the filename.
		if (pic_url.fileName.match(/(?:jpg|jpeg|swf|bmp|gif|png|flv|ico)$/i)) var displayName = pic_url.fileName;
		// nsIURL.param was removed in Gecko 9.0
		//else if (pic_url.param) var displayName = pic_url.fileName + pic_url.param;
		else if (pic_url.query) var displayName = pic_url.fileName + pic_url.query;
		else if (pic_url.ref) var displayName = pic_url.fileName + pic_url.ref;
		else var displayName = pic_url.fileName;
		}

	if (displayName) {
		if (!displayName.match(/(?:jpg|jpeg|swf|bmp|gif|png|flv|ico)$/i))
			displayName += ".jpg";
		}

	// if we still haven't got a file name to use, make a random one to use
	if (!displayName) displayName = Math.random().toString().substring(2) + ".jpg";

	// remove characters from the file name that causes trouble with file system (windows or nsiFile, who knows)
	displayName = displayName.replace(/[\\/:*?"<>|,]/g, '');

	ihg_Functions.LOG("In " + myself + ", displayName is equal to: " + displayName + "\n");

	ihg_Functions.LOG("In " + myself + ", ihg_Globals.AUTO_RENAME is equal to: " + ihg_Globals.AUTO_RENAME + "\n");
	if (ihg_Globals.AUTO_RENAME) {
		// does anyone even read this shit?  if so, email me: cybormatt@gmail.com
		// I really should get a life...

		var reqUrl = reqObj.reqURL;
		if (reqUrl.search(/imagevenue\.com\//) >= 0 || reqUrl.search(/fapomatic\.com\//) >= 0) {
			var indxVal = displayName.indexOf("_");
			if (indxVal != -1) displayName = displayName.substr(indxVal+1);
			
			if (reqUrl.search(/imagevenue\.com\//) >= 0) displayName = displayName.replace(/(.+)_12[23]_\d+lo(\..{3,4})$/, "$1$2");
			
			ihg_Functions.LOG("In " + myself + ", displayName is equal to: " + displayName + "\n");
			}
		else if (reqUrl.search(/imagehaven\.net\//) >= 0) {
			displayName = displayName.replace(/^[A-Z0-9]{10}_/, "");

			ihg_Functions.LOG("In " + myself + ", displayName is equal to: " + displayName + "\n");
			}
		}

	if (ihg_Globals.prefix_fileNames) displayName = ihg_Functions.prefixFName(reqObj, displayName);		
	displayName = ihg_Functions.cutFName(displayName);
	
	return displayName;
}




ihg_Functions.getOutputFile = function getOutputFile(reqObj, URLFile) {
	var displayName = null;

	if (reqObj.retried && reqObj.fileName) displayName = reqObj.fileName;
	else {
		var contType = reqObj.xmlhttp.getResponseHeader("Content-type");
		if (contType.match(/image\/.+/)) {
			var contDisp = reqObj.xmlhttp.getResponseHeader("Content-disposition");
			if (contDisp) {
				var mhp = Components.classes["@mozilla.org/network/mime-hdrparam;1"]
										.getService(Components.interfaces.nsIMIMEHeaderParam);
				displayName = mhp.getParameter(contDisp, "filename", "", true, {});
				displayName = displayName.replace(/[\\/:*?"<>|,]/g, '');
				ihg_Functions.LOG("Filename(Response-Header): " + displayName + "\n");
			
				if (ihg_Globals.prefix_fileNames) displayName = ihg_Functions.prefixFName(reqObj, displayName);
				}
			}
			
		if (!displayName) {
			displayName = ihg_Functions.generateFName(reqObj, URLFile);
			ihg_Functions.LOG("Filename(URL): " + displayName + "\n");
			}
			
		reqObj.overwrite = false;
		}
		
	if (!displayName) {
		// still no output file -> retry request
		ihg_Functions.LOG("In function getOutputFile, can not get displayName from request header\n");
		var retry_dick = "(" + String(ihg_Globals.maxRetries - reqObj.retryNum + 1) + " " + ihg_Globals.strings.of + " " + String(ihg_Globals.maxRetries) + ")";
		ihg_Functions.updateDownloadProgress(null, reqObj.uniqID, null, null, ihg_Globals.strings.could_not_get_filename + " " + retry_dick)
		reqObj.retry();
		return null;
		}

	

	// Initiate the local file object
	var dir = reqObj.dirSave;
	var aLocalFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	try {
		aLocalFile.initWithPath(dir);
		}
	catch(e) {
		ihg_Functions.updateDownloadProgress(null, reqObj.uniqID, null, null,ihg_Globals.strings.failed_to_initialize);
		ihg_Functions.LOG("something went wrong with initiating the local file.\n");
		ihg_Functions.LOG("URLFile: " + URLFile + " , dir: " + dir + "\n");
		ihg_Functions.LOG("displayName: " + displayName + "\n");
		return null;
		}
	aLocalFile.append(displayName);

	var resumeDownload = reqObj.curProgress > 0 && reqObj.maxProgress > 0;

	// Actions to do if the target file already exists
	if (ihg_Globals.fileExistsBehavior == "rename" && !reqObj.overwrite && !resumeDownload) {
		// This causes files to not overwrite themselves.  It's good... trust me
		var postfix = 0;
		var tmpDispName = "";
		
		while (aLocalFile.exists()) {
			postfix++;
			var strPostFix = postfix + "";
			while (strPostFix.length < 3) strPostFix = "0" + strPostFix;
			indxVal = displayName.lastIndexOf(".");
			tmpDispName = displayName.substr(0, indxVal) + "_" + strPostFix + displayName.substr(indxVal);
			ihg_Functions.LOG("tmpDispName is equal to: " + tmpDispName + "\n");
			aLocalFile.initWithPath(dir);
			aLocalFile.append(tmpDispName);
			}
		}
	else if (ihg_Globals.fileExistsBehavior == "skip" && aLocalFile.exists() && !reqObj.overwrite && !resumeDownload) {
		ihg_Functions.updateDownloadProgress(null, reqObj.uniqID, aLocalFile.leafName, 100, ihg_Globals.strings.file_already_exists);
		ihg_Functions.LOG("File " + aLocalFile.path + " already exists. Skipping....\n");

		reqObj.finished = true;
		reqObj.inprogress = false;

		reqObj.queueHandler();
		return null;
	}

	ihg_Functions.LOG("aLocalFile.path is equal to: " + aLocalFile.path + "\n");
	return aLocalFile;
}


// special case: get file name from response header
ihg_Functions.getFNameFromHeader = function getFNameFromHeader(reqObj, request) {
	var displayName = null;
		
	try {
		var httpChan = request.QueryInterface(Components.interfaces.nsIHttpChannel);
		var contDisp = httpChan.getResponseHeader("Content-disposition");
		if (!contDisp) return null;
		var mhp = Components.classes["@mozilla.org/network/mime-hdrparam;1"]
									.getService(Components.interfaces.nsIMIMEHeaderParam);
		displayName = mhp.getParameter(contDisp, "filename", "", true, {});
		displayName = displayName.replace(/[\\/:*?"<>|,]/g, '');
		ihg_Functions.LOG("Filename(Response-Header): " + displayName + "\n");

		if (ihg_Globals.prefix_fileNames) displayName = ihg_Functions.prefixFName(reqObj, displayName);
		displayName = ihg_Functions.cutFName(displayName);
		}
	catch (e) {
		ihg_Functions.LOG("Error: " + e + "\n");
		}

	return displayName;
}


ihg_Functions.prefixFName = function prefixFName(reqObj, fname) {
	var result = fname;
	
	var formatted = "";
	var totLength = reqObj.totLinkNum.toString().length;
	var curLength = reqObj.curLinkNum.toString().length;
	for (var j=0; j < totLength - curLength; j++) formatted += "0";
	formatted += reqObj.curLinkNum;
	result = reqObj.uniqFN_prefix + "_" + formatted + "_" + result;
	
	return result;
}


ihg_Functions.cutFName = function cutFName(fname) {
	var maxLength = 240;
	var result = fname;

	// the regex splits the full file name into the main file name and the extension
	var tempVar = result.match(/(.+)\.(jpg|jpeg|swf|bmp|gif|png|flv|ico)$/i);

	// if the main file name is longer than maxLength chars, then shorten it
	if(tempVar[1].length > maxLength)
		result = tempVar[1].substring(0, maxLength-4) + Math.random().toString().substring(2,6) + "." + tempVar[2];

	return result;
}


ihg_Functions.doStartDownload = function doStartDownload(reqObj, URLFile) {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)[\n\s]*{/m)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");
	ihg_Functions.LOG("URLFile is equal to: " + URLFile + "\n");
	
	if (typeof(reqObj.regexp) == "string" && reqObj.regexp.match(/Embedded Image/)) var refURL = reqObj.originatingPage;
	else var refURL = reqObj.reqURL;

	// if a reference URL was given, set up a new URI object for it
	if (refURL) var ref_uri = ihg_Globals.ioService.newURI(refURL,null,null);
	else var ref_uri = null;
	ihg_Functions.LOG("In " + myself + ", refURL: " + refURL + " , ref_uri: " + ref_uri + "\n");

	// initialize the pic uri object
	var pic_uri = ihg_Globals.ioService.newURI(URLFile,null,null);

	var startPos = 0;
	
	var aLocalFile = ihg_Functions.getOutputFile(reqObj, URLFile);
	if (aLocalFile == null) {
		reqObj.abort(ihg_Globals.strings.could_not_initialize);
		return;
	}

	if (!aLocalFile.parent.exists()) {
		reqObj.abort(ihg_Globals.strings.target_directory_no_longer_exists);
		return;
	}

	if (reqObj.maxProgress > 0) {
		if (!aLocalFile.exists()) ihg_Functions.LOG("In " + myself + ", file to resume no longer exists ... reloading");
		else startPos = aLocalFile.fileSize;
		// Let's make sure that reqObj.notResumable is false, since maxProgress is indeed greater than 0
		reqObj.notResumable = false;
		}

	// Set up the stream/progress listener
	var aListener = new ihg_Functions.ihg_ProgressListener();
	aListener.refURL = refURL;
	aListener.reqObj = reqObj;
	aListener.aFile = aLocalFile;


	// Make a new resumable channel
	var aResChan = ihg_Globals.ioService.newChannelFromURI(pic_uri);
	if (!reqObj.notResumable) aResChan.QueryInterface(Components.interfaces.nsIResumableChannel);
	aResChan.QueryInterface(Components.interfaces.nsIHttpChannel);


	// tell that channel to resume at the given byte position
	if (!reqObj.notResumable && startPos != 0) aResChan.resumeAt(startPos, "");

	// assign the listener from above to the notification callback property
	// this is what handles the incoming data
	aResChan.notificationCallbacks = aListener;

	// assign the referrer uri
	aResChan.referrer = ref_uri;

	// and finally, open the channel,
	// providing the same listener to handle the start/stop events
	ihg_Functions.LOG("In " + myself + ", about to save the URI.\n");
	aResChan.asyncOpen(aListener, null);
  
	ihg_Functions.LOG("Exiting " + myself + "\n");
	return 0;
	}


ihg_Functions.removeDuplicates = function removeDuplicates(docLinks, thumbLinks){
	var cleanDocLinks = new Array();
	var cleanThumbLinks = new Array();

	for (var i = ihg_Globals.firstPage; i <= ihg_Globals.lastPage; i++) {
 		cleanDocLinks[i] = new Array();
 		cleanThumbLinks[i] = new Array();
 		loop:
 		for (var j = 0; j < docLinks[i].length; j++) {
 			for (var k = ihg_Globals.firstPage; k < cleanDocLinks.length; k++) {
 				if (!ihg_Globals.remove_duplicate_links_across_pages) k = i;
 				for (var l = 0; l < cleanDocLinks[k].length; l++) {
 					if (cleanDocLinks[k][l] == docLinks[i][j]) {
						if (thumbLinks) {
							if (!cleanThumbLinks[k][l]) cleanThumbLinks[k][l] = thumbLinks[i][j];
						}
 						continue loop;
					}
				}
			}
 			cleanDocLinks[k-1][l] = docLinks[i][j];
 			if (thumbLinks) cleanThumbLinks[k-1][l] = thumbLinks[i][j];
		}
		// The originating page is added to the end of docLinks array if
		// IHG is run in thread sucker mode. We should NOT remove it.
		if (ihg_Globals.suckMode && cleanDocLinks[i][cleanDocLinks[i].length-1] != docLinks[i][docLinks[i].length-1]) {
			cleanDocLinks[i][cleanDocLinks[i].length] = docLinks[i][docLinks[i].length-1];
		}
	}

	return { docLinks:cleanDocLinks, thumbLinks:cleanThumbLinks };
}

ihg_Functions.restartFF = function restartFF() {
	var nsIAppStartup = Components.interfaces.nsIAppStartup;
    Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup).quit(nsIAppStartup.eForceQuit | nsIAppStartup.eRestart);
}
