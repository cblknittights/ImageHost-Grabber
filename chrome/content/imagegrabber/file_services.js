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

// CacheFileService constructor
//
// cacheFileID: a string representing the file

ihg_Functions.CacheFileService = function CacheFileService(cacheFileID) {
	if (!cacheFileID) throw "IHG error: cacheFileID is null in CacheFileService";

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var cacheFile = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.addonPath", Components.interfaces.nsILocalFile);
	cacheFile.append("cache");

	if (!cacheFile.exists()) cacheFile.create(1, 0755);

	cacheFile.append(cacheFileID);

	this.cacheFile = cacheFile;
	this.fout = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);

	this.SIS = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
	}

ihg_Functions.CacheFileService.prototype = {
	writeCache : function cache_writeCache(someStuff, append_or_not) {	// set to false to overwrite; default is false
		if (!someStuff) throw "IHG error: someStuff is null in cache_writeCache";

		var myself = arguments.callee.name;
		ihg_Functions.LOG("Entering " + myself + "\n");

		var f_perms = 0755;  // this is ignored on windows
		var f_flags = 0x02 | 0x08;

		if (append_or_not) f_flags |= 0x10;
		else f_flags |= 0x20;

		var count = someStuff.length;

		this.fout.init(this.cacheFile, f_flags, f_perms, null);

		this.fout.write(someStuff, count);
		this.fout.close();
		},

	getCache : function cache_getCache() {
		if (!this.cacheFile.exists()) return null;

		var myself = arguments.callee.name;
		ihg_Functions.LOG("Entering " + myself + "\n");

		var fileURI = ihg_Globals.ioService.newFileURI(this.cacheFile);
		var channel = ihg_Globals.ioService.newChannelFromURI(fileURI);

		var stream = channel.open();

		var count = stream.available();
		this.SIS.init(stream);
		var shitty = this.SIS.read(count);

		return shitty;
		}
	}

ihg_Functions.forumStyleFileService = function forumStyleFileService() {
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var forumStyleFile = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.addonPath", Components.interfaces.nsILocalFile);
	forumStyleFile.append("forum_styles.xml");
	this.forumStyleFile = forumStyleFile;
	}

ihg_Functions.forumStyleFileService.prototype = {
	getForumStyles : function forum_getForumStyles() {
		if (!this.forumStyleFile.exists()) return null;

		var myself = arguments.callee.name;
		ihg_Functions.LOG("Entering " + myself + "\n");

		var fileURI = ihg_Globals.ioService.newFileURI(this.forumStyleFile);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		return req.responseXML;
		}
	}

// The HostFileService class simply reads the data from the host file, then passes it along
// as a XML document that can be parsed with the DOM (Document Object Model).
// Check out https://developer.mozilla.org/En/DOM for a description of the DOM
ihg_Functions.HostFileService = function HostFileService() {
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	try {
		var hostFile = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.hostfileloc", Components.interfaces.nsILocalFile);
		}
	catch (e) {
		var hostFile = null;
		}

	if (!hostFile || !hostFile.exists()) {
		hostFile = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.addonPath", Components.interfaces.nsILocalFile);
		hostFile.append("hostf.xml");
		}

	var hostf_servers = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.addonPath", Components.interfaces.nsILocalFile);
	hostf_servers.append("hostf_servers.xml");

	this.hostFile = hostFile;
	this.hostf_servers = hostf_servers;
	}

ihg_Functions.HostFileService.prototype = {
	getHosts : function host_getHosts() {
		if (!this.hostFile.exists()) return null;

		var myself = arguments.callee.name;
		ihg_Functions.LOG("Entering " + myself + "\n");

		var fileURI = ihg_Globals.ioService.newFileURI(this.hostFile);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		return req.responseXML;
		},

	getHostf_servers : function host_getHostf_servers() {
		if (!this.hostf_servers.exists()) return null;

		var fileURI = ihg_Globals.ioService.newFileURI(this.hostf_servers);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		return req.responseXML;
		}
	}

ihg_Functions.dlWinCacheService = function dlWinCacheService(cacheFilePath) {
	if (!cacheFilePath) throw "IHG error: cacheFilePath is null in dlWinCacheService";

	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var cacheFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	cacheFile.initWithPath(cacheFilePath);

	this.cacheFile = cacheFile;
	}

ihg_Functions.dlWinCacheService.prototype = {
	writeCache : function dlWin_writeCache(req_objs) {
		var newDocument = Components.classes["@mozilla.org/xml/xml-document;1"].createInstance(Components.interfaces.nsIDOMXMLDocument);
		var newRoot = newDocument.createElement("root");

		for(var i = 0; i < req_objs.length; i++) { 
			var newReqObj = newDocument.createElement("reqObj");
			newReqObj.setAttribute("id", "req_" + i);

			for (var j in req_objs[i]) {
				var x = typeof(req_objs[i][j]); 
				if ( (x != "object" && x != "function") || j == "regexp" ) {
					var newProp = newDocument.createElement("prop");
					newProp.setAttribute("id", j + "_" + i);
					newProp.setAttribute("type", x);

					if (req_objs[i][j].toString().match(/function/)) newProp.appendChild(newDocument.createCDATASection(req_objs[i][j]));
					else newProp.appendChild(newDocument.createTextNode(req_objs[i][j]));

					newReqObj.appendChild(newDocument.createTextNode("\n"));
					newReqObj.appendChild(newProp);
					//newReqObj.appendChild(newDocument.createTextNode("\n"));
					}
				}
			newReqObj.appendChild(newDocument.createTextNode("\n"));

			newRoot.appendChild(newDocument.createTextNode("\n")); 
			newRoot.appendChild(newReqObj); 
			newRoot.appendChild(newDocument.createTextNode("\n"));
			}

		newDocument.appendChild(newRoot);

		/* OLD CODE (version 1.6.5):
		var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
		persist.persistFlags = persist.PERSIST_FLAGS_NO_CONVERSION | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES | persist.PERSIST_FLAGS_BYPASS_CACHE;
		persist.saveDocument(newDocument, this.cacheFile, null, null, null, null);
		*/
		ihg_Functions.writeXMLDocumentToFile(newDocument, this.cacheFile);
		},

	getCache : function dlWin_getHosts() {
		if (!this.cacheFile.exists()) return null;

		var fileURI = ihg_Globals.ioService.newFileURI(this.cacheFile);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		return req.responseXML;
		}
	}

ihg_Functions.blacklistService = function blacklistService() {
	ihg_Functions.LOG("Entering " + arguments.callee.name + "\n");

	try {
		var blacklistFile = ihg_Globals.prefManager.getComplexValue("extensions.imagegrabber.blacklistfilepath", Components.interfaces.nsILocalFile);
		}
	catch (e) {
		var blacklistFile = null;
		}

	if (!blacklistFile || !blacklistFile.exists()) {
		var cacheDir = Components.classes["@mozilla.org/file/directory_service;1"]
						.getService(Components.interfaces.nsIProperties)
						.get("ProfD", Components.interfaces.nsIFile);
		cacheDir.append("ihg_cache");
		if (!cacheDir.exists() || !cacheDir.isDirectory()) {
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
			}

		blacklistFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		blacklistFile.initWithPath(cacheDir.path);
		blacklistFile.append("blacklist.xml")
		}

	this.blacklistFile = blacklistFile;
	}


ihg_Functions.blacklistService.prototype = {
	readList : function blacklist_getList() {
		ihg_Functions.LOG("Entering " + arguments.callee.name + "\n");

		var list = [];
		if (!this.blacklistFile.exists())
			return list;

		var fileURI = ihg_Globals.ioService.newFileURI(this.blacklistFile);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		var content = req.responseXML;
		var patterns = content.getElementsByTagName("pattern");

		for (var i = 0; i < patterns.length; i++) {
			try {
				var ptype = patterns[i].getAttribute("type");
				if (ptype == "string") {
					list.push({type: ptype, value: patterns[i].textContent, testValue: patterns[i].textContent.toLowerCase()});
					}
				else if (ptype == "regexp") {
					list.push({type: ptype, value: patterns[i].textContent, testValue: new RegExp(patterns[i].textContent, "i")});
					}
				}
			catch (ex) {
				//nothing to do
				}
			}

		return list;
		},

	writeList : function blacklist_writeList(list) {
		ihg_Functions.LOG("Entering " + arguments.callee.name + "\n");

		var newDocument = Components.classes["@mozilla.org/xml/xml-document;1"].createInstance(Components.interfaces.nsIDOMXMLDocument);
		var newRoot = newDocument.createElement("root");
		newRoot.appendChild(newDocument.createTextNode("\n")); 

		for (var i = 0; i < list.length; i++) { 
			var newPattern = newDocument.createElement("pattern");
			newPattern.setAttribute("type", list[i].type);
			newPattern.appendChild(newDocument.createCDATASection(list[i].value));

			newRoot.appendChild(newPattern); 
			newRoot.appendChild(newDocument.createTextNode("\n"));
			}

		newDocument.appendChild(newRoot);

		ihg_Functions.writeXMLDocumentToFile(newDocument, this.blacklistFile);
		}
	}