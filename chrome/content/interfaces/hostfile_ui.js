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



var hostfile_Globals = new Object();

hostfile_Globals.ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
hostfile_Globals.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
hostfile_Globals.hosts = null;
hostfile_Globals.hFile = null;
hostfile_Globals.hostFileObj = null;
hostfile_Globals.hostFileLoc = "";
hostfile_Globals.addonPath = "";

ihg_Globals.strbundle = document.getElementById("imagegrabber-strings");
ihg_Functions.read_locale_strings();

function HostFileService() {
	var id = "{E4091D66-127C-11DB-903A-DE80D2EFDFE8}"; // imagegrabber's ID
	var hostFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	var hostf_servers = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

	if(hostfile_Globals.hostFileLoc != "") {
		hostFile.initWithPath(hostfile_Globals.hostFileLoc);
		var fuckwhore = hostFile.exists();
		if (!fuckwhore) hostfile_Globals.hostFileLoc = "";
		}

	// This should work for Firefox v1.5+  It returns a file object initialized
	// with the path where the extension is located
	try {
		hostf_servers = Components.classes["@mozilla.org/extensions/manager;1"]
      		    .getService(Components.interfaces.nsIExtensionManager).getInstallLocation(id).getItemLocation(id); 
		if(hostfile_Globals.hostFileLoc == "") hostFile.initWithPath(hostf_servers.path);
		}
	// For those who are still using the antiquated Firefox versions
	catch(e) {
		hostf_servers = Components.classes["@mozilla.org/file/directory_service;1"]
			    .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
		hostf_servers.append("extensions");
		hostf_servers.append(id);
		if(hostfile_Globals.hostFileLoc == "") hostFile.initWithPath(hostf_servers.path);
		}

	if(hostfile_Globals.hostFileLoc == "") hostFile.append("hostf.xml");
	hostf_servers.append("hostf_servers.xml");

	this.hostf_servers = hostf_servers;
	this.hostFile = hostFile;
	}


HostFileService.prototype = {
	writeHosts : function host_writeCache() {
		var newRoot = hostfile_Globals.hFile.createElement("root");
		var newHosts = new Array();

		for (var i = 0; i < hostfile_Globals.hosts.length; i++) newHosts[i] = hostfile_Globals.hosts[i].cloneNode(true);

		for (var i = 0; i < newHosts.length; i++) { 
			newRoot.appendChild(hostfile_Globals.hFile.createTextNode("\n")); 
			newRoot.appendChild(newHosts[i]); 
			newRoot.appendChild(hostfile_Globals.hFile.createTextNode("\n")); 
			}
		hostfile_Globals.hFile.removeChild(hostfile_Globals.hFile.firstChild);
		hostfile_Globals.hFile.appendChild(newRoot);

		var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
		persist.persistFlags = persist.PERSIST_FLAGS_NO_CONVERSION | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES | persist.PERSIST_FLAGS_BYPASS_CACHE;
		persist.saveDocument(hostfile_Globals.hFile, this.hostFile, null, null, null, null);
	},

	getHosts : function host_getHosts() {
		if( !this.hostFile.exists() ) return null;

		var fileURI = hostfile_Globals.ioService.newFileURI(this.hostFile);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);
		
		return req.responseXML;
		},

	getHostf_servers : function() {
		if( !this.hostf_servers.exists() ) return null;

		var fileURI = hostfile_Globals.ioService.newFileURI(this.hostf_servers);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);
		
		return req.responseXML;
		}

	}

function sortHosts() {
	var tmpList = new Array();

	for (var i = 0; i < hostfile_Globals.hosts.length; i++)
		tmpList[i] = hostfile_Globals.hosts[i].getAttribute("id");

	tmpList = tmpList.sort();

	for (var i = 0; i < tmpList.length; i++) {
		for (var j = 0; j < hostfile_Globals.hosts.length; j++) {
			if (tmpList[i] == hostfile_Globals.hosts[j].getAttribute("id")) {
				tmpList[i] = hostfile_Globals.hosts[j].cloneNode(true);
				break;
				}
			}
		}

	for (var i = 0; i < tmpList.length; i++) {
		hostfile_Globals.hFile.firstChild.replaceChild(tmpList[i], hostfile_Globals.hosts[i]);
		}
	}

function initWindow() {
	var id = "{E4091D66-127C-11DB-903A-DE80D2EFDFE8}"; // imagegrabber's ID
	var nsLocFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

	// This should work for Firefox v1.5 to v3.6  It returns a file object initialized
	// with the path where the extension is located	
	try {
		nsLocFile = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).getInstallLocation(id).getItemLocation(id); 
		hostfile_Globals.addonPath = nsLocFile.path;
		initWindow2();
	}

	// For 4.0+ series
	catch (e) {
		Components.utils.import("resource://gre/modules/AddonManager.jsm"); 
		var tempFunc = function(addon) {
			hostfile_Globals.addonPath = addon.getResourceURI("").QueryInterface(Components.interfaces.nsIFileURL).file.path;
			initWindow2();
		}
		AddonManager.getAddonByID(id, tempFunc);
	}	
}

function initWindow2() {
	//var tb_searchPattern = document.getElementById("tb_searchPattern");
	//tb_searchPattern.addEventListener("keydown", handleKeyDown, false);
	//document.onkeydown = handleKeyDown;

	//window.addEventListener("resize", resizeResponseTextBox, false);
	//resizeResponseTextBox();

	loadHostFile();
	// document.getElementById("theList").setAttribute("label", ihg_Globals.strings.select_host);

	var searchType = document.getElementById("searchType");
	searchType.removeAllItems();

	[['ID','"\\"ID: ...\\""'],
	 ['RegExp','"\\"...\\""'],
	 ['Replace','"\\"REPLACE: \'" + uPat + "\', \'...\'\\""'],
//	 ['Redirect','"\\"REDIRECT: \'" + uPat + "\', \'...\'\\""'],
	 ['Link2Img','"function(pageData, pageUrl) {" + maxThreads_LineCode + "\\n\\treturn {imgUrl: pageUrl, status: \\"OK\\"};\\n\\t}"'],
	 ['function','"function(pageData, pageUrl) {" + maxThreads_LineCode + "\\n\\tvar retVal = {};" + \
					"\\n\\t\\n\\t\\/\\/ Insert your code hereunder to build the target URL\\n\\t\\/\\/ Acceptable values for retVal.status are: \\"OK\\", \\"ABORT\\", \\"RETRY\\" or \\"REQUEUE\\"" + \
					"\\n\\t\\n\\tvar iUrl = ...;\\n\\t\\n\\tif (!iUrl) {\\n\\t\\tretVal.imgUrl = null;\\n\\t\\tretVal.status = \\"ABORT\\";" + \
					"\\n\\t\\t}\\n\\telse {\\n\\t\\tretVal.imgUrl = iUrl;\\n\\t\\tretVal.status = \\"OK\\";\\n\\t\\t}\\n\\t\\n\\treturn retVal;\\n\\t}"']]
	 .forEach(function(sType) {
		var newElem = searchType.appendItem(sType[0]);
		var thecommand = "var maxthreads = (document.getElementById(\"cb_hostMaxThreads\").checked ? document.getElementById(\"tb_hostMaxThreads\").value : 0); \
							var uPat = document.getElementById(\"tb_urlPattern\").value; \
							var maxThreads_LineCode = (maxthreads == 0 ? '' : '\\n\\tif (ihg_Globals.appName == \"ImageHost Grabber\") ihg_Globals.maxThreads = ' + maxthreads + ';\\n\\t'); \
							if (!uPat) uPat = '...'; \
							document.getElementById(\"tb_searchPattern\").value = " + sType[1] + ";";
		newElem.setAttribute("oncommand", thecommand);
		});

	// document.getElementById("searchType").setAttribute("label", "Select...");
	resetTextBoxes();
	}

function handleKeyDown(event) {
	// Keycode for Tab
	if (event.keyCode == 9) {
		var pp = event.target;
		var val = pp.value;
		var selIdx = pp.selectionStart;
		if (!(event.shiftKey || event.ctrlKey)) {
			pp.value = val.slice(0,selIdx) + "\t" + val.slice(selIdx);
			pp.selectionStart = selIdx + 1;
			pp.selectionEnd = selIdx + 1;
			}
		event.preventDefault();
		event.stopPropagation();
		return false;
		}
	// Keycode for Return
	if (event.keyCode == 13) {
		var pp = event.target;
		// var val = pp.value;
		var val = pp.value.slice(0, pp.selectionStart) + pp.value.slice(pp.selectionEnd);
		var selIdx = pp.selectionStart;
		var lines = val.split("\n");
		var indices = new Array();
		indices[0] = {start:0, end:lines[0].length};
		for (var i = 1; i < lines.length; i++) {
			indices[i] = {};
			indices[i].start = indices[i-1].end + 1;
			indices[i].end = indices[i].start + lines[i].length;
			}
		
		for (var i = 0; i < indices.length; i++) {
			if (indices[i].start <= selIdx && indices[i].end >= selIdx) {
				var spacing = lines[i].match(/^(\s+)?/)[0];
				//alert(lines[i] + "; \"" + spacing + "\"");
				if (indices[i].start == selIdx)
					spacing = spacing + "\n"
				else
					spacing = "\n" + spacing;
				pp.value = val.slice(0, selIdx) + spacing + val.slice(selIdx);
				pp.selectionStart = selIdx + spacing.length;
				pp.selectionEnd = selIdx + spacing.length;
				break;
				}
			}

		event.preventDefault();
		event.stopPropagation();
		
		return false;
		}
	
	return event.keyCode;
	}

function handleKeyUp(event) {
	return event.keyCode;
}
/* 
function resizeResponseTextBox() {
	var rBoxThing = document.getElementById("tb_searchPattern");
	rBoxThing.height = window.innerHeight - 212;
	}
 */
function loadHostFile() {
	hostfile_Globals.hostFileLoc = hostfile_Globals.prefManager.getCharPref("extensions.imagegrabber.hostfileloc");

	hostfile_Globals.hostFileObj = new HostFileService();
	hostfile_Globals.hFile = hostfile_Globals.hostFileObj.getHosts();
	hostfile_Globals.hosts = hostfile_Globals.hFile.getElementsByTagName("host");

	sortHosts();

	document.getElementById("tb_hostFileLoc").value = hostfile_Globals.hostFileObj.hostFile.path;

	var menu_popup = document.getElementById("theList");
	menu_popup.removeAllItems();

	for (var i = 0; i < hostfile_Globals.hosts.length; i++) {
		var newElem = menu_popup.appendItem(hostfile_Globals.hosts[i].getAttribute("id"), i);
		//newElem.setAttribute("onclick", "fillTBs(this.value);");
		newElem.setAttribute("oncommand", "fillTBs(this.value);");
		}
	}

function fillTBs(idx) {
	var uPatNode = hostfile_Globals.hosts[idx].getElementsByTagName("urlpattern")[0];
	var uPat = uPatNode.textContent;
	var sPatNode = hostfile_Globals.hosts[idx].getElementsByTagName("searchpattern")[0];
	var sPat = sPatNode.textContent;

	var hl_tbout = document.getElementById("tb_hostLabel");
	hl_tbout.value = hostfile_Globals.hosts[idx].getAttribute("id");

	var mt_tbout = document.getElementById("tb_hostMaxThreads");
	var maxThreads = hostfile_Globals.hosts[idx].getAttribute("maxThreads");
	
	var cbMaxThreads = document.getElementById("cb_hostMaxThreads");
	cbMaxThreads.checked = (maxThreads != null)?true:false;
	mt_tbout.disabled = !cbMaxThreads.checked;
	mt_tbout.value = (maxThreads != null)?maxThreads:1;

	var timer_tbout = document.getElementById("tb_downloadTimeout");
	var timeout = hostfile_Globals.hosts[idx].getAttribute("Timeout");

	var cbDLTimeout = document.getElementById("cb_downloadTimeout");
	cbDLTimeout.checked = (timeout != null)?true:false;
	timer_tbout.disabled = !cbDLTimeout.checked;
	timer_tbout.value = (timeout != null)?timeout:1;
	
	var up_tbout = document.getElementById("tb_urlPattern");
	up_tbout.value = uPat;

	var sp_tbout = document.getElementById("tb_searchPattern");
	if(!sPat.match(/function/)) sp_tbout.value = sPat.replace("\\\\", "\\", "g");
	else sp_tbout.value = sPat;

	document.getElementById("but_updateFile").disabled = false;
	document.getElementById("but_addHost").disabled = true;
	document.getElementById("but_delHost").disabled = false;

	// document.getElementById("searchType").setAttribute("label", "Select...");
	with (document.getElementById("searchType")) setAttribute("label", getAttribute("_label"));
	}

function updateHostFile() {
	var urlPattern = document.getElementById("tb_urlPattern").value;
	var searchPattern = document.getElementById("tb_searchPattern").value;
	if (!searchPattern.match(/function/)) searchPattern = searchPattern.replace(/\\(?!\")/g, "\\\\");
	var label = document.getElementById("tb_hostLabel").value;
	var maxThreads = document.getElementById("tb_hostMaxThreads").value;
	var timeout = document.getElementById("tb_downloadTimeout").value;
	var cb_maxThreads = document.getElementById("cb_hostMaxThreads").checked;
	var cb_timeout = document.getElementById("cb_downloadTimeout").checked;
	var menupopup = document.getElementById("theList");
	var idx = menupopup.value;

	hostfile_Globals.hosts[idx].setAttribute("id", label);
	
	if (cb_maxThreads == false)	hostfile_Globals.hosts[idx].removeAttribute("maxThreads");
	else hostfile_Globals.hosts[idx].setAttribute("maxThreads", maxThreads);
	
	if (cb_timeout == false) hostfile_Globals.hosts[idx].removeAttribute("Timeout");
	else hostfile_Globals.hosts[idx].setAttribute("Timeout", timeout);

	var uPatNode = hostfile_Globals.hosts[idx].getElementsByTagName("urlpattern")[0];
	uPatNode.textContent = urlPattern;

	var sPatNode = hostfile_Globals.hosts[idx].getElementsByTagName("searchpattern")[0];
	if (searchPattern.match(/function/)) {
		var cData = hostfile_Globals.hFile.createCDATASection(searchPattern);
		sPatNode.removeChild(sPatNode.firstChild);
		sPatNode.appendChild(cData);
		}
	else sPatNode.textContent = searchPattern;

	sortHosts();

	hostfile_Globals.hostFileObj.writeHosts();

	loadHostFile();

	//document.getElementById("theList").setAttribute("label", label);
	for (var i = 0; i < menupopup.itemCount; i++) { 
		var zha = menupopup.getItemAtIndex(i);
		if (zha.label == label) { 
			menupopup.selectedIndex = i;
			fillTBs(i);
			break;
			}
		}
	}

function addHost() {
	var urlPattern = document.getElementById("tb_urlPattern").value;
	var searchPattern = document.getElementById("tb_searchPattern").value;
	if (!searchPattern.match(/function/)) searchPattern = searchPattern.replace(/\\(?!\")/g, "\\\\");
	var label = document.getElementById("tb_hostLabel").value;
	var maxThreads = document.getElementById("tb_hostMaxThreads").value;
	var timeout = document.getElementById("tb_downloadTimeout").value;
	var cb_maxThreads = document.getElementById("cb_hostMaxThreads").checked;
	var cb_timeout = document.getElementById("cb_downloadTimeout").checked;

	var menupopup = document.getElementById("theList");

	var newHost = hostfile_Globals.hFile.createElement("host");
	newHost.setAttribute("id", label);
	
	if (cb_maxThreads == false)	newHost.removeAttribute("maxThreads");
	else newHost.setAttribute("maxThreads", maxThreads);
	
	if (cb_timeout == false) newHost.removeAttribute("Timeout");
	else newHost.setAttribute("Timeout", timeout);

	var newUP = hostfile_Globals.hFile.createElement("urlpattern");
	newUP.textContent = urlPattern;

	var newSP = hostfile_Globals.hFile.createElement("searchpattern");
	if (searchPattern.match(/function/)) {
		var cData = hostfile_Globals.hFile.createCDATASection(searchPattern);
		newSP.appendChild(cData);
		}
	else newSP.textContent = searchPattern;

	newHost.appendChild(hostfile_Globals.hFile.createTextNode("\n"));
	newHost.appendChild(newUP);
	newHost.appendChild(hostfile_Globals.hFile.createTextNode("\n"));
	newHost.appendChild(newSP);
	newHost.appendChild(hostfile_Globals.hFile.createTextNode("\n"));

	hostfile_Globals.hFile.firstChild.appendChild(newHost);
	hostfile_Globals.hFile.firstChild.appendChild(hostfile_Globals.hFile.createTextNode("\n\n"));

	sortHosts();

	hostfile_Globals.hostFileObj.writeHosts();

	loadHostFile();

	//document.getElementById("theList").setAttribute("label", label);
	for (var i = 0; i < menupopup.itemCount; i++) { 
		var zha = menupopup.getItemAtIndex(i);
		if (zha.label == label) { 
			menupopup.selectedIndex = i;
			fillTBs(i);
			break;
			}
		}
	}

function deleteHost() {
	var idx = document.getElementById("theList").value;
	
	// It was reported that the first host could not be deleted in the
	// host file editor.  Upon inspection, I can not see why we should
	// prevent index 0 from being removed.
	// -- cybormatt
	//if (!idx || (idx == 0)) return;
	if (!idx) return;

	hostfile_Globals.hFile.firstChild.removeChild(hostfile_Globals.hosts[idx]);
	hostfile_Globals.hostFileObj.writeHosts();

	loadHostFile();
	resetTextBoxes();
	}


function changeHostFile() {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);


	var FpTitle=ihg_Globals.strings.pick_host_file;
		
	fp.init(top.window, FpTitle, nsIFilePicker.modeOpen);
	var res = fp.show();

	if (res == nsIFilePicker.returnOK) {
 		if (fp.file && (fp.file.path.length > 0)) {
			hostfile_Globals.prefManager.setCharPref("extensions.imagegrabber.hostfileloc", fp.file.path);
			loadHostFile();
			resetTextBoxes();
			}
 		}
	}

function onlineHostF() {
	var serverList = hostfile_Globals.hostFileObj.getHostf_servers();
	var servers = serverList.getElementsByTagName("server");

	for (var i=0; i < servers.length; i++) {
		var someUrl = servers[i].textContent;

		var req = new XMLHttpRequest();

		req.open("GET", someUrl, false);
		req.overrideMimeType('text/xml');
		req.send(null);
		var blah = mergeHostFile(req.responseXML);
		}
	}


function mergeHostFile(onlineXML) {
	if (!onlineXML) {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);


		var FpTitle=ihg_Globals.strings.pick_host_file;
		
		fp.init(top.window, FpTitle, nsIFilePicker.modeOpen);
		var res = fp.show();

		if (res != nsIFilePicker.returnOK) return false;
		if (!fp.file) return false;
		if (!(fp.file.path.length > 0)) return false;

		var fileURI = hostfile_Globals.ioService.newFileURI(fp.file);
		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);

		var mergFile = req.responseXML;
		}
	else mergFile = onlineXML;

	var mergHosts = mergFile.getElementsByTagName("host");

	var tmpList = new Array();

	for (var i=0; i < mergHosts.length; i++)
		tmpList[i] = mergHosts[i].getAttribute("id");

	tmpList = tmpList.sort();

	for (var i = 0; i < tmpList.length; i++) {
		for (var j = 0; j < mergHosts.length; j++) {
			if (tmpList[i] == mergHosts[j].getAttribute("id")) {
				tmpList[i] = mergHosts[j].cloneNode(true);
				break;
				}
			}
		}

	for (var i = 0; i < tmpList.length; i++)
		mergFile.firstChild.replaceChild(tmpList[i], mergHosts[i]);

	var overWriteMode = confirm(ihg_Globals.strings.overwrite_mode);
			
	for (var i=0; i < mergHosts.length; i++) {
		for (var j=0; j < hostfile_Globals.hosts.length; j++) {
			if (mergHosts[i].getAttribute("id") == hostfile_Globals.hosts[j].getAttribute("id")) {
				if (overWriteMode) hostfile_Globals.hFile.firstChild.removeChild(hostfile_Globals.hosts[j]);
				else { mergFile.firstChild.removeChild(mergHosts[i]); i--; }
				break;
				}
			}
		}


	for (var i=0; i < mergHosts.length; i++) {
		// This rule is not strictly enforced.
		// But, it ensures the owner document is proper
		var tmpNode = hostfile_Globals.hFile.importNode(mergHosts[i], true);
		hostfile_Globals.hFile.firstChild.appendChild(tmpNode);
		}

	sortHosts();
	hostfile_Globals.hostFileObj.writeHosts();

	loadHostFile();
	resetTextBoxes();

	return true;
	}


function resetHostFileLoc() {
	hostfile_Globals.prefManager.setCharPref("extensions.imagegrabber.hostfileloc", "");
	loadHostFile();
}


function resetTextBoxes() {
	// document.getElementById("theList").setAttribute("label", ihg_Globals.strings.select_host);
	with (document.getElementById("theList")) setAttribute("label", getAttribute("_label"));
	document.getElementById("tb_hostLabel").value = "";
	document.getElementById("cb_hostMaxThreads").checked = false;
	document.getElementById("tb_hostMaxThreads").disabled = true;
	document.getElementById("tb_hostMaxThreads").value = "1";
	document.getElementById("cb_downloadTimeout").checked = false;
	document.getElementById("tb_downloadTimeout").disabled = true;
	document.getElementById("tb_downloadTimeout").value = "1";
	
	document.getElementById("tb_urlPattern").value = "";
	document.getElementById("tb_searchPattern").value = "";
	
	document.getElementById("but_updateFile").disabled = true;
	document.getElementById("but_addHost").disabled = false;
	document.getElementById("but_delHost").disabled = true;
	
	// document.getElementById("searchType").setAttribute("label", "Select...");
	with (document.getElementById("searchType")) setAttribute("label", getAttribute("_label"));
	}
