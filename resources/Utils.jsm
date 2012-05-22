const EXPORTED_SYMBOLS =
	[
	"printLine",
	"reloadMain",
	"closeMain",
	"openWindow",
	"testIt",
	"promptSvc"
];

const MAIN_WIN_TYPE = "ihgxa";
const MAIN_WIN = "chrome://ihg-xul-app/content/main.xul";
const JSCON_WIN = "chrome://global/content/console.xul";

promptSvc = {
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService),
	
	alert : function alert(text,title) {
		if (title == null)
			title = "Alert";
			
		this.promptService.alert(this.window, title, text);
	}
}

function WIN_ARGS() {
	this.focusAll = false;
	this.killMe = false;
	this.jsShell = false;
	this.wrappedJSObject = this;
}

Components.utils.import("resource://gre/modules/Services.jsm");

function openWindow(aChromeURISpec, aArgument, aFeatures, aName, aParent) {
	if (aFeatures == null)
		aFeatures = "chrome,menubar,toolbar,status,resizable,dialog=no";
	if (aName == null)
		aName = "_blank";
	
	return Services.ww.openWindow(aParent, aChromeURISpec, aName, aFeatures, aArgument);
}

function printLine(message) {
	var prefix = "IHG Xul";
	
	var caller = printLine.caller;
	if (caller != null )
		prefix += " (" + caller.name + "): "
	else
		prefix += ": "
		
	message = prefix + message;
	
	Services.console.logStringMessage(message);
	dump(message + "\n");
}

function reloadMain() {
	printLine("checking window state...");
	var wm = Services.wm
		var enumerator = wm.getEnumerator(MAIN_WIN_TYPE);
	
	if (enumerator.hasMoreElements()) {
		printLine("main window found, reloading...");
		var args = new WIN_ARGS();
		args.killMe = true;

		var win = enumerator.getNext();
		win.onunload = function () {
			openWindow(MAIN_WIN, args);
		}
		win.close();
	} else {
		var args = new WIN_ARGS();
		args.focusAll = true;
		args.jsShell = true;
		
		printLine("opening main window as normal...");
		openWindow(MAIN_WIN, args);
	}
	
}

function closeMain() {
	printLine("shutting down application...");
	var args = new WIN_ARGS();
	
	args.killMe = true;
	openWindow(MAIN_WIN, args);
}
