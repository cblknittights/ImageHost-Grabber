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


ihg_Functions.getPicById = function getPicById(req) {
	
	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot && !req.override_stop) return;

	var myself = String(arguments.callee).match(/(function.*)\(.*\)\s*{/)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var refURL = req.reqURL;
	var theID = req.regexp.match(/ID: (.+)/)[1];

	var curSource = ihg_Functions.getImgSrcById(req.xmlhttp.responseText , theID);
	if(!curSource) return null;

	var someURI = ihg_Globals.ioService.newURI(refURL, null, null);
	var the_url = someURI.resolve(curSource);

	return the_url;
}


ihg_Functions.getPicByRegExp = function getPicByRegExp(req) {
	
	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot && !req.override_stop) return;

	var myself = String(arguments.callee).match(/(function.*)\(.*\)\s*{/)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var refURL = req.reqURL;
	var regexp = new RegExp(req.regexp);

	var imageElems = ihg_Functions.getImgTags(req.xmlhttp.responseText);
	if (!imageElems) return null;
	
	var the_url = "";

	for (var n = 0; n < imageElems.length; n++) {
		var curSource = ihg_Functions.getImgSrcFromTag(imageElems[n]);
		if (curSource) {
			if (imageElems[n].match(req.regexp)) {
				var someURI = ihg_Globals.ioService.newURI(refURL, null, null);
				the_url = someURI.resolve(curSource);
			}
		}
	}
	return the_url;
	}


ihg_Functions.genericHostFunc = function genericHostFunc() {
	var req = this.parent;
	req.callwrapper.cancel();

	var toDieOrNot = ihg_Globals.prefManager.getBoolPref("extensions.imagegrabber.killmenow");
	if (toDieOrNot && !req.override_stop) return;

	var myself = String(arguments.callee).match(/(function.*)\(.*\)\s*{/)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");

	var pageData = this.responseText;
	var pageUrl = req.reqURL;

	if(typeof(req.regexp) == "function") {
		var retVal = req.regexp(pageData, pageUrl);

		if (retVal.fileName) req.baseFileName = retVal.fileName;
		if (retVal.referer) req.referer = retVal.referer;

		if (retVal.status == "OK") {
			var ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

			var someURI = ioservice.newURI(pageUrl, null, null);
			var the_url = someURI.resolve(retVal.imgUrl);
		}

		if (retVal.status == "ABORT") {
			req.abort(ihg_Globals.strings.cant_find_image);
			return;
		}

		if (retVal.status == "RETRY") {
			if (retVal.imgUrl) {
				req.reqURL = retVal.imgUrl;
				req.retryNum++;
			}
			req.retry();
			return;
		}

		if (retVal.status == "REQUEUE") {
			var newPageUrl = retVal.imgUrl;
			// var newHostToUse = ihg_Functions.getHostToUse(newPageUrl);
			// if (!newHostToUse) {
				// ihg_Functions.updateDownloadStatus(ihg_Globals.strings.cant_find_new_host);
				// throw "IHG error: can't find new host function for requeue in genericHostFunc";
				// req.abort(ihg_Globals.strings.cant_find_new_host);
				// return;
			// }

			// req.regexp = newHostToUse.hostFunc;

			// req.reqURL = newPageUrl;
			// req.retryNum++;

			// req.retry();
			req.requeue(newPageUrl);
			return;
		}
	}

	else if(typeof(req.regexp) == "string") {
		if (req.regexp.match(/Embedded Image/)) {
			var the_url = req.reqURL;
			// By default, the doStartDownload function uses the "reqURL" property as the
			// referring url.  For embedded images, we're going to change this to the
			// originating page.
			/* req.reqURL = req.originatingPage; 	BUG - if you try to restart the download, you get a wrong URL
													We should do this in the function doStartDownload */
			}
		else if (req.regexp.match(/ID: .+/)) {
			var the_url = ihg_Functions.getPicById(req);
		}
		else if (req.regexp.match(/REPLACE: .+/)) {
			var tempMatch = req.regexp.match(/REPLACE: ('|")(.*)\1.*,.*('|")(.*)\3/);
			var the_url = req.reqURL.replace( new RegExp(tempMatch[2]), tempMatch[4] );
		}
		else if (req.regexp.match(/^REDIRECT$/)) {
			var newPageUrl = this.channel.URI.spec;
			req.requeue(newPageUrl);
			return;
		}
		else var the_url = ihg_Functions.getPicByRegExp(req);

		if (!the_url) {
			req.abort(ihg_Globals.strings.cant_find_image);
			return;
		}
	}

	else { throw "IHG error: the regexp value is not a string or function for " + req.uniqID; }

	ihg_Functions.LOG("In " + myself + ", fixing to start download\n");
	ihg_Functions.doStartDownload(req, the_url);
}



ihg_Functions.getHostToUse = function getHostToUse(innerLink) {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)\s*{/)[1];
	ihg_Functions.LOG("Entering " + myself + " with innerLink of: " + innerLink + "\n");

	if (ihg_Globals.lastHost.urlPattern) {
		if (innerLink.search(ihg_Globals.lastHost.urlPattern) >= 0)
			return {
				hostID : ihg_Globals.lastHost.hostID ,
				maxThreads : ihg_Globals.lastHost.maxThreads ,
				downloadTimeout : ihg_Globals.lastHost.downloadTimeout ,
				hostFunc : ihg_Globals.lastHost.searchPattern
				};
		}

	if (!ihg_Globals.hosts_list) {
		// Initialize an instance of the host file class
		var hostFileObj = new ihg_Functions.HostFileService();

		// Get the XML document representation of the host file
		var hFile = hostFileObj.getHosts();
		
		// Get all the "hosts" as an array.  This is a DOM procedure.
		ihg_Globals.hosts_list = hFile.getElementsByTagName("host");
		
		ihg_Functions.createExceptionsList();
		}
		
	var matches = false;
	for (var i = 0; !matches && (i < ihg_Globals.exceptions_list[0].length); i++) {
		matches = (innerLink.search(ihg_Globals.exceptions_list[0][i]) >= 0);
		}

	if (!matches) {
		//Search in the unknownHost_list
		for (var i = 0; i < ihg_Globals.unknownHosts_list.length; i++) {
			if (innerLink.indexOf(ihg_Globals.unknownHosts_list[i]) == 0) {
				//ihg_Functions.LOG(innerLink + " is in ihg_Globals.unknownHosts_list, " + myself + " returns false\n");
				return null;
				}
			}
		}
		
	var retval = null;
	for (var i=0; i<ihg_Globals.hosts_list.length; i++) {
		// Read the urlpattern node from the current host element.  This is a DOM procedure.
		var uPatNode = ihg_Globals.hosts_list[i].getElementsByTagName("urlpattern")[0];
		
		// Create a regular expression from the urlpattern
		var uPat = new RegExp(uPatNode.textContent);

		if (innerLink.search(uPat) >= 0) {
			// Read searchpattern from host element.  This is a DOM procedure.
			var sPatNode = ihg_Globals.hosts_list[i].getElementsByTagName("searchpattern")[0];
			ihg_Functions.LOG(sPatNode.toSource() + "\n");
			
			var tempThing = sPatNode.textContent;
			ihg_Functions.LOG(tempThing + "\n");
			
			// If the searchpattern is a function, dynamically create a function for it
			if (tempThing.search(/^function/) >= 0) {			
				var cunt = tempThing.match(/function\((.+),(.+)\)/);
				ihg_Functions.LOG(cunt.toSource() + "\n");
				
				var aa = tempThing.replace(/[\n\f\r]/g, 'NEWLINE');
				ihg_Functions.LOG(aa + "\n");
				
				var bb = aa.match(/{(.+)}/)[1];
				ihg_Functions.LOG(bb + "\n");
				
				var cc = bb.replace(/NEWLINE/g, '\n');
				ihg_Functions.LOG(cc + "\n");
				
				retval = new Function(cunt[1], cunt[2], cc);
				ihg_Functions.LOG(retval.toSource() + "\n");
				}
			// Otherwise, return the value as a string, minus the surrounding quotes and
			// the double back-slashes.  The surrounding quotes and double back-slashes were
			// originally used so the eval statemnt would interpret the data properly.  Now
			// they are useless, but they will be kept for compatibility purposes.
			else {
				retval = tempThing.match(/\"(.+)"/)[1].replace(/\\\\/g, '\\');
				ihg_Functions.LOG(retval + "\n");
				}
				
			ihg_Globals.lastHost.hostID = ihg_Globals.hosts_list[i].getAttribute("id");
			ihg_Globals.lastHost.maxThreads = ihg_Globals.hosts_list[i].getAttribute("maxThreads");
			if (!ihg_Globals.lastHost.maxThreads) ihg_Globals.lastHost.maxThreads = 0;
			ihg_Globals.lastHost.downloadTimeout = ihg_Globals.hosts_list[i].getAttribute("Timeout");
			if (!ihg_Globals.lastHost.downloadTimeout) ihg_Globals.lastHost.downloadTimeout = 0;
			else ihg_Globals.lastHost.downloadTimeout *= 1000;
			ihg_Globals.lastHost.urlPattern = uPat;
			ihg_Globals.lastHost.searchPattern = retval;

			break;
			}
		}
    //We don't have a rule to handle this host
    //It must be added to the unknownHosts_list (if it isn't in the exceptions_list)
    if (!retval) {
        var urlBase = innerLink.match(/(^https?:\/\/.+?)\//);
        if (urlBase) urlBase = urlBase[1];
        else urlBase = innerLink;
        
        for (var i = 0; i < ihg_Globals.exceptions_list[1].length; i++) {
            if (urlBase.indexOf(ihg_Globals.exceptions_list[1][i]) >= 0) return null;
			}

        ihg_Globals.unknownHosts_list.push(urlBase);
		}
	
	if (retval) return { hostID : ihg_Globals.lastHost.hostID , maxThreads : ihg_Globals.lastHost.maxThreads , downloadTimeout : ihg_Globals.lastHost.downloadTimeout , hostFunc : retval };
	else return null;
	}


/* Create the exceptions_list using the host file
	- ihg_Globals.exceptions_list[0] contains regular expressions that
	don't match any specific domain (like the ones used for Coppermine
	galleries and SmugMug)
	- ihg_Globals.exceptions_list[1] contains domain names (strings)
	*/
ihg_Functions.createExceptionsList = function createExceptionsList() {
	var myself = String(arguments.callee).match(/(function.*)\(.*\)\s*{/)[1];
	ihg_Functions.LOG("Entering " + myself + "\n");
	
	ihg_Globals.exceptions_list = new Array();
	ihg_Globals.exceptions_list.push(new Array());
	ihg_Globals.exceptions_list.push(new Array());
	
	for (var i = 0; i < ihg_Globals.hosts_list.length; i++) {
		var uPat = ihg_Globals.hosts_list[i].getElementsByTagName("urlpattern")[0].textContent;
		var h = uPat.match(/(?:\^)?http(?:.*?):\\\/\\\/((.+?\\\/)|.+)/);
		
		if (!h) continue;
		var parts = h[1].split(".");
		var domain = parts[parts.length-2];

		if (!domain) {
			ihg_Globals.exceptions_list[0].push(new RegExp(uPat));
			}
		else {		
			if (domain.match(/(?:^(?:org|com?|net)\\)|(?:\?:)/)) domain = parts[parts.length-3];
			domain = domain.replace(/^\)\??/, "");
			domain = domain.replace(/\\$/, "");
			domain = domain.replace(/[\+\*]/g, "");
			domain += ".";

			ihg_Globals.exceptions_list[1].push(domain);
			}
		}
	}