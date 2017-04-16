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


var hostf_servers_Globals = new Object();

hostf_servers_Globals.hosts = null;
hostf_servers_Globals.hFile = null;
hostf_servers_Globals.hostFileObj = null;


function HostFileService() {
	var addonPath = document.getElementById("addonPath").value;
	var hostf_servers = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	hostf_servers.initWithPath(addonPath);
	hostf_servers.append("hostf_servers.xml");

	this.hostf_servers = hostf_servers;
	}


HostFileService.prototype = {
	writeHosts : function cache_writeCache() {
		var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);
		persist.persistFlags = persist.PERSIST_FLAGS_NO_CONVERSION | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES | persist.PERSIST_FLAGS_BYPASS_CACHE;
		persist.saveDocument(hostf_servers_Globals.hFile, this.hostf_servers, null, null, null, null);
	},

	getHostf_servers : function() {
		if( !this.hostf_servers.exists() ) return null;

		var fileURI = ihg_Globals.ioService.newFileURI(this.hostf_servers);

		var req = new XMLHttpRequest();
		req.open("GET", fileURI.spec, false);
		req.send(null);
		
		return req.responseXML;
		}
	}


function setButtonsAccess() {
	var servers_list = document.getElementById("tb_searchPattern");

	var upButton = document.getElementById("up");
	var downButton = document.getElementById("down");
	var removeButton = document.getElementById("remove");

	switch (servers_list.selectedCount) {
		case 0:
			upButton.disabled = downButton.disabled = removeButton.disabled = true;
			break;
		case 1:
			upButton.disabled = servers_list.selectedIndex == 0;
			downButton.disabled = servers_list.selectedIndex == servers_list.childNodes.length - 1;
			removeButton.disabled = false;
			break;
		default:
			upButton.disabled = true;
			downButton.disabled = true;
			removeButton.disabled = false;
		}
	}

function loadHostFServersFile() {
	hostf_servers_Globals.hostFileObj = new HostFileService();
	hostf_servers_Globals.hFile = hostf_servers_Globals.hostFileObj.getHostf_servers();
	hostf_servers_Globals.hosts = hostf_servers_Globals.hFile.getElementsByTagName("server");

	var servers_list = document.getElementById("tb_searchPattern");

	for (var i=0; i < hostf_servers_Globals.hosts.length; i++) {
		servers_list.appendItem(hostf_servers_Globals.hosts[i].textContent);
		}
	}

function updateHostFServersFile() {
	var newRoot = hostf_servers_Globals.hFile.createElement("root");

	var servers_list = document.getElementById("tb_searchPattern");
	for (var i = 0; i < servers_list.getRowCount(); i++) {
		var server_def = servers_list.getItemAtIndex(i);
		var tmp = hostf_servers_Globals.hFile.createElement("server");
		tmp.textContent = server_def.label;

		newRoot.appendChild(hostf_servers_Globals.hFile.createTextNode("\n"));
		newRoot.appendChild(tmp);
		}
	newRoot.appendChild(hostf_servers_Globals.hFile.createTextNode("\n"));

	hostf_servers_Globals.hFile.removeChild(hostf_servers_Globals.hFile.firstChild);
	hostf_servers_Globals.hFile.appendChild(newRoot);

	hostf_servers_Globals.hostFileObj.writeHosts();
	}

function updateHostFServer() {
	var servers_list = document.getElementById("tb_searchPattern");

	var tmpVal = prompt(ihg_Globals.strings.enter_host_file_server, servers_list.selectedItem.label);
	if (!tmpVal) return;

	servers_list.selectedItem.label = tmpVal;
	}

function addHostFServer() {
	var newHost = prompt(ihg_Globals.strings.new_host_file_server);
	if (!newHost) return;

	var servers_list = document.getElementById("tb_searchPattern");
	servers_list.appendItem(newHost);
	}

function moveHostFServer(UpDown) {
	var servers_list = document.getElementById("tb_searchPattern");
	if (!servers_list.selectedItem) return;

	var newIndex = servers_list.selectedIndex + UpDown;
	if ( newIndex < 0 || newIndex == servers_list.getRowCount() ) return;

	var server = servers_list.selectedItem;
	servers_list.removeChild(server);
	servers_list.insertBefore(server, servers_list.getItemAtIndex(newIndex));
	servers_list.selectedItem=server;
	}

function delHostFServer() {
	var servers_list = document.getElementById("tb_searchPattern");
	if (!servers_list.selectedItem) return;

	servers_list.removeItemAt(servers_list.selectedIndex);
	}