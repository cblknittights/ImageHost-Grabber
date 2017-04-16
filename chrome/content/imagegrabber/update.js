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

promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

///////////////////////////////////////////////////////////
// Functions used to update the host file (hostf.xml)

ihg_Functions.autoUpdate = function autoUpdate() {
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var hostFileObj = new ihg_Functions.HostFileService();
	var serverList = hostFileObj.getHostf_servers();
	var servers = serverList.getElementsByTagName("server");
	
	var localLastMod = new Date(hostFileObj.hostFile.lastModifiedTime);
	ihg_Functions.LOG("Local host file -> Last-Modified: " + localLastMod.toString() + "\n");

	for (var i=0; i < servers.length; i++) {
		var someUrl = servers[i].textContent;
		var req = new XMLHttpRequest();

		try {
			req.open("HEAD", someUrl, false);
			req.overrideMimeType('text/xml');
			req.send(null);
				
			if (req.status == 200) {
				var remoteLastModStr = req.getResponseHeader("Last-Modified");
				if (!remoteLastModStr) continue;
			
				var remoteLastMod = new Date(remoteLastModStr);
				ihg_Functions.LOG("Remote host file (" + someUrl + ") -> Last-Modified: " + remoteLastMod.toString() + "\n");
			
				if (remoteLastMod > localLastMod) {
					var conf = ihg_Globals.hostfUpdateConfirm;
					if (!conf) conf = promptService.confirm(null, null, ihg_Globals.strings.updated_hostf_found + "\n" + ihg_Globals.strings.update_local_hostf);
				
					if (conf) {
						req = new XMLHttpRequest();

						try {
							req.open("GET", someUrl, false);
							req.overrideMimeType('text/xml');
							req.send(null);

							if (req.status == 200) {
								ihg_Functions.mergeHostFile(req.responseXML, hostFileObj);
								ihg_Functions.LOG("The local host file has been successfully updated.\n");
							}
						}
						catch (e) {
							ihg_Functions.LOG("Error: " + e + "\n");
						}
					}
					else ihg_Functions.LOG("User has cancelled the operation.\n");
					
					break;
				}
			}
		}
		catch (e) {
			ihg_Functions.LOG("Error: " + e + "\n");
		}
	}
	
	ihg_Functions.LOG("Exiting " + myself + "\n");
}

ihg_Functions.mergeHostFile = function mergeHostFile(onlineXML, hostFileObj) {
	var mergFile = onlineXML;
	var mergHosts = mergFile.getElementsByTagName("host");

	var hFile = hostFileObj.getHosts();
	var hosts = hFile.getElementsByTagName("host");

	var tmpList = Array.map(mergHosts, function(host) {return host.getAttribute("id")}).sort();

	for (var i = 0; i < tmpList.length; i++) {
		for (var j = 0; j < mergHosts.length; j++) {
			if (tmpList[i] == mergHosts[j].getAttribute("id")) {
				mergFile.firstChild.appendChild(mergHosts[j]);
				break;
				}
			}
		}

	// var overWriteMode = false;
	// if (ihg_Globals.hostfMergeBehavior == "ask") overWriteMode = confirm(ihg_Globals.strings.overwrite_mode);
	// else if (ihg_Globals.hostfMergeBehavior == "overwrite") overWriteMode = true;
	switch(ihg_Globals.hostfMergeBehavior) {
		case "ask":			var overWriteMode = promptService.confirm(null, null, ihg_Globals.strings.overwrite_mode); break;
		case "overwrite":	var overWriteMode = true; break;
		case "add":			var overWriteMode = false; break;
		}

	for (var i=0; i < mergHosts.length; i++) {
		for (var j=0; j < hosts.length; j++) {
			if (mergHosts[i].getAttribute("id") == hosts[j].getAttribute("id")) {
				if (overWriteMode) hFile.firstChild.removeChild(hosts[j]);
				else { mergFile.firstChild.removeChild(mergHosts[i]); i--; }
				break;
				}
			}
		}

	for (var i=0; i < mergHosts.length; i++) {
		// This rule is not strictly enforced.
		// But, it ensures the owner document is proper
		var tmpNode = hFile.importNode(mergHosts[i], true);
		hFile.firstChild.appendChild(tmpNode);
		}

	ihg_Functions.sortHosts(hFile, hosts);
	ihg_Functions.writeHosts(hostFileObj, hFile, hosts);
	}

ihg_Functions.sortHosts = function sortHosts(hFile, hosts) {
	var tmpList = Array.map(hosts, function(host) {return host.getAttribute("id")}).sort();

	for (var i = 0; i < tmpList.length; i++) {
		for (var j = 0; j < hosts.length; j++) {
			if (tmpList[i] == hosts[j].getAttribute("id")) {
				hFile.firstChild.appendChild(hosts[j]);
				break;
				}
			}
		}
	}

ihg_Functions.writeHosts = function writeHosts(hostFileObj, hFile, hosts) {
	var newRoot = hFile.createElement("root");
	var newHosts = new Array();

	for (var i=0; i < hosts.length; i++) newHosts[i] = hosts[i].cloneNode(true);

	for (var i=0; i < newHosts.length; i++) { 
		newRoot.appendChild(hFile.createTextNode("\n")); 
		newRoot.appendChild(newHosts[i]); 
		newRoot.appendChild(hFile.createTextNode("\n")); 
		}
	hFile.removeChild(hFile.firstChild);
	hFile.appendChild(newRoot);

	var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
	persist.persistFlags = persist.PERSIST_FLAGS_NO_CONVERSION | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES | persist.PERSIST_FLAGS_BYPASS_CACHE;
	persist.saveDocument(hFile, hostFileObj.hostFile, null, null, null, null);
}