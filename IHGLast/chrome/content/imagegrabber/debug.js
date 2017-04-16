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

LogFile = null;
MsgBuffer = [];
promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

//////////////////////  Initialize the logFile Object  //////////////////////
ihg_Functions.initLogFile = function initLogFile() {
	LogFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	LogFile.initWithPath(ihg_Globals.addonPath);
	LogFile.append("logs");

	// Create the logs directory if it's not already there
	if( !(LogFile.exists()) )  LogFile.create(1, 0755);

	LogFile.append("log.txt");

	// Create the log file if it's not already there
	if( !(LogFile.exists()) )  LogFile.create(0, 0755);
	}

/****************************************************************************
 *	The following lines are the flags used for file-output.  These were
 *	taken from prio.h which can be found this at lxr.mozilla.org
 *	If you plan on changing anything with regards to the flags, you
 *	should read the comments in prio.h to undestand how these work.
 *
 *	613 #define PR_RDONLY       0x01
 *	614 #define PR_WRONLY       0x02
 *	615 #define PR_RDWR         0x04
 *	616 #define PR_CREATE_FILE  0x08
 *	617 #define PR_APPEND       0x10
 *	618 #define PR_TRUNCATE     0x20
 *	619 #define PR_SYNC         0x40
 *	620 #define PR_EXCL         0x80
 ***************************************************************************/

/////////////////  Dump to the log file  /////////////////////////////////
ihg_Functions.Dump2LOG = function Dump2LOG( message ) {
	var the_date = String(Date()).split(" ");
	var dateForm = the_date[4] + " " + the_date[2] + " " + the_date[1] + " " + the_date[3];
	MsgBuffer.push(dateForm + "\t" + message);

	if (!LogFile || !LogFile.path) {
		if (!ihg_Globals.addonPath) {
			try {
				ihg_Globals.addonPath = ihg_Globals.prefManager.getCharPref("extensions.imagegrabber.addonPath");
				}
			catch(e) {return;}
			}
		ihg_Functions.initLogFile();
		}

	var f_perms = 0755;  // this is ignored on windows
	var f_flags = 0x02 | 0x10;

	try {
		ihg_Globals.fileOut.init(LogFile, f_flags, f_perms, null);
		}
	catch(e) {
		LogFile.create(0, 0755);
		ihg_Globals.fileOut.init(LogFile, f_flags, f_perms, null);
		}

	while (MsgBuffer.length) {
		var outMessage = MsgBuffer.shift();
		var count = outMessage.length;
		ihg_Globals.fileOut.write(outMessage, count);
		}

	ihg_Globals.fileOut.close();
}

/////////////////  Dump to the log file (for Debug)  /////////////////////
ihg_Functions.LOG = function LOG( message ) {
	if (ihg_Globals.debugOut) ihg_Functions.Dump2LOG(message);
}

/////////////////  Dump to the log file (for Console)  ///////////////////
ihg_Functions.CON_LOG = function CON_LOG( message ) {
	if (ihg_Globals.conLogOut) ihg_Functions.Dump2LOG(message);
}

/////////////////  Clears the log file    ///////////////////////
ihg_Functions.clearLog = function clearLog() {
	var f_perms = 0755;  // this is ignored on windows
	var f_flags = 0x02 | 0x20;

	if (!LogFile || !LogFile.path) ihg_Functions.initLogFile();

	ihg_Globals.fileOut.init(LogFile, f_flags, f_perms, null);

	ihg_Globals.fileOut.write("", 0);
	ihg_Globals.fileOut.close();

	promptService.alert(null, null, ihg_Globals.strings.debug_log_cleared);
}

/////////////  Copys the log file to some location   //////////////
ihg_Functions.copyLog = function copyLog() {
	if (!LogFile || !LogFile.path) ihg_Functions.initLogFile();

	var copyToDir = ihg_Functions.setDownloadDir(ihg_Globals.strings.pick_a_folder, null);

	if (!copyToDir) return;

	var newDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);

	newDir.initWithPath(copyToDir);

	try {
		LogFile.copyTo(newDir, null);
		}
	catch(e) {
		promptService.alert(null, null, ihg_Globals.strings.failed_to_copy);
		return;
		}

	promptService.alert(null, null, ihg_Globals.strings.log_file_copied);
}

/////////////////////  Get the console messages  ////////////////////
ihg_Functions.getConMsgs = function getConMsgs() {
	if(!ihg_Globals.conLogOut) return;

	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

	var temp1 = new Object();
	var temp2 = new Object();

	consoleService.getMessageArray(temp1, temp2);
	var msgObj = temp1.value;

	consoleService.registerListener(ihg_Globals.consoleListener);

	for(var i=0; i < msgObj.length; i++) ihg_Functions.CON_LOG(msgObj[i].message + "\n");
}

/////////////////////  Unregister console listener  ////////////////////
ihg_Functions.unregisterConsoleListener = function unregisterConsoleListener() {
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	consoleService.unregisterListener(ihg_Globals.consoleListener);
}

///////////////  Listener for the error console  /////////////////////

ihg_Globals.consoleListener = {
	observe : function(msgObj) { ihg_Functions.CON_LOG(msgObj.message + "\n"); },

	QueryInterface: function (iid) {
		if (!iid.equals(Components.interfaces.nsIConsoleListener) && !iid.equals(Components.interfaces.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
			}
		return this;
		}
}