Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var myWebProgressListener = {
	oldURL: null,

	processNewURL: function(aURI, aFlags) {
		if (aURI.spec == this.oldURL) return;
		if (aFlags & Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) return;

		// now we know the page/document has changed...
		let isForum = isThread(content.document.location.href);
		document.getElementById('SuckThread').setAttribute('disabled', !isForum);
		document.getElementById('suck_the_current_thread-tip').setAttribute('hidden', isForum);

		this.oldURL = aURI.spec;
	},

	// nsIWebProgressListener
	QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

	onLocationChange: function(aProgress, aRequest, aURI, aFlags) {
		this.processNewURL(aURI, aFlags);
	},

	onStateChange: function() {},
	onProgressChange: function() {},
	onStatusChange: function() {},
	onSecurityChange: function() {}
};

function ihg_initOverlay() {
	gBrowser.addProgressListener(myWebProgressListener);
	document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", ihg_contextMenuInit, false);
	document.getElementById("menu_ToolsPopup").addEventListener("popupshowing", ihg_showInToolsInit, false);

	/* Set the correct place for the ImageHost Grabber menu */
	/* This could possibly be done with XBL to make it tidier */
	var showInTools = document.getElementById("showInTools").value;
	document.getElementById('menu_IGmain').setAttribute('hidden', showInTools);

	/* Get the correct add-on path for IHG and store it globally
	 *
	 * This has to be done because "AddonManager" is asynchronous,
	 * thus, making it difficult to use in the file services.
	 */
	var id = ihg_Globals.addonID; // imagegrabber's ID
	var ihgDefaultBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getDefaultBranch("extensions.imagegrabber.");

	// For 4.0+ series
	try {
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		var tempFunc = function(addon) {
			ihg_Globals.addonPath = addon.getResourceURI("").QueryInterface(Components.interfaces.nsIFileURL).file.path;
			ihgDefaultBranch.setCharPref("addonPath", ihg_Globals.addonPath);
			ihgDefaultBranch.lockPref("addonPath");
			ihgDefaultBranch.setCharPref("addonVersionCurrent", addon.version);
			ihgDefaultBranch.lockPref("addonVersionCurrent");
			CheckUpdate();
		}
		AddonManager.getAddonByID(id, tempFunc);
	}

	// This should work for Firefox v1.5 to v3.6
	// It returns a file object initialized with the path where the extension is located
	catch (e) {
		let ExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
		let nsLocFile = ExtensionManager.getInstallLocation(id).getItemLocation(id);
		ihg_Globals.addonPath = nsLocFile.path;
		ihgDefaultBranch.setCharPref("addonPath", ihg_Globals.addonPath);
		ihgDefaultBranch.lockPref("addonPath");
		let version = ExtensionManager.getItemForID(id).version;
		ihgDefaultBranch.setCharPref("addonVersionCurrent", version);
		ihgDefaultBranch.lockPref("addonVersionCurrent");
		CheckUpdate();
	}

	ihgDefaultBranch.setCharPref("enable@startup", stringify({enableConLog: ihg_Globals.conLogOut, enableDebug: ihg_Globals.debugOut}));

	// DEBUG CODE
	// ihg_Globals.ConsoleWin = GetConsoleWindow();
	// END DEBUG CODE
}

function ihg_destroyOverlay() {
	gBrowser.removeProgressListener(myWebProgressListener);
	document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", ihg_contextMenuInit, false);
	document.getElementById("menu_ToolsPopup").removeEventListener("popupshowing", ihg_showInToolsInit, false);

	if (ihg_Globals.conLogOut) ihg_Functions.unregisterConsoleListener();
}

function GetConsoleWindow() {
	var nsIWindowWatcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
	var ihgConsoleWindow = nsIWindowWatcher.getWindowByName("IhgConsoleWindow", null);

	var winArgs = {
		Callback : ihgConsoleWindow_onloaded
	}

	winArgs.wrappedJSObject = winArgs;

	if (!ihgConsoleWindow)
	{
		ihgConsoleWindow = nsIWindowWatcher.openWindow(null, "chrome://imagegrabber/content/interfaces/console.xul", "IhgConsoleWindow", "resizable,scrollbars=yes", winArgs);
	}

	return ihgConsoleWindow;
}

function ihgConsoleWindow_onloaded()
{
	ihg_Globals.Console = ihg_Globals.ConsoleWin.Accessor;
}

function CheckUpdate() {
	var versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
							.getService(Components.interfaces.nsIVersionComparator);

	var ihgBranch = ihg_Globals.prefManager.getBranch("extensions.imagegrabber.");

	let Prev = ihgBranch.getCharPref("addonVersionPrevious");
	let Curr = ihgBranch.getCharPref("addonVersionCurrent");

	if (versionComparator.compare(Curr, Prev) > 0) {
		var default_hostFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		default_hostFile.initWithPath(ihg_Globals.addonPath);
		default_hostFile.append("hostf.xml");
		if (default_hostFile.exists()) {
			default_hostFile.lastModifiedTime = 0;
			ihgBranch.setCharPref("addonVersionPrevious", Curr);
		}
	}
}

function ihg_toolbarButtonCommand(event) {
	if (event.target.id == "imagehostgrabber-toolbarbutton")
		ihg_Functions.hostGrabber(null, false);
}

function ihg_toolbarButtonClick(event) {
	if (isThread(content.document.location.href) == false) return;

	switch(event.button) {
		//case 0:
			// Left click
			//break;
		case 1:
			// Middle click
			ihg_Functions.leechThread();
			break;
		//case 2:
			// Right click
			//break;
	}
}

function isThread(URL) {
	if (ihg_Globals.forums == null) {
		var forumStyleFileObj = new ihg_Functions.forumStyleFileService();
		var fsFile = forumStyleFileObj.getForumStyles();
		ihg_Globals.forums = fsFile.getElementsByTagName("forum");
	}

	for (var i = 0; i < ihg_Globals.forums.length; i++) {
		var uPatNode = ihg_Globals.forums[i].getElementsByTagName("urlpattern")[0];
		var uPat = new RegExp(uPatNode.textContent);
		if (URL.match(uPat)) return true;
	}

	return false;
}

function ihg_showInToolsInit() {
	if (this.state == 'open') return;

	let showInTools = document.getElementById("showInTools").value;
	document.getElementById('ihgSep').setAttribute('hidden', !showInTools);
	document.getElementById('menu_IGtools').setAttribute('hidden', !showInTools);
}

function ihg_contextMenuInit() {
	if (this.state == 'open') return;
	if (window.gContextMenu == null) return;

	var isLnk = gContextMenu.onLink;

	var sst = document.getElementById("suck_sel_thread");
	if (isLnk && isThread(content.document.activeElement.href)) {
		sst.setAttribute("disabled", false);
		sst.removeAttribute("tooltip");
	}
	else {
		sst.setAttribute("disabled", true);
		sst.setAttribute("tooltip", "suck_the_current_thread-tip");
	}
}