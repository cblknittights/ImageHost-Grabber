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


function rightOn() {
	this.document.getElementById("uniqID").value = reqObj.uniqID;
	this.document.getElementById("pageNum").value = reqObj.pageNum;
	this.document.getElementById("totLinkNum").value = reqObj.totLinkNum;
	this.document.getElementById("curLinkNum").value = reqObj.curLinkNum;
	this.document.getElementById("reqURL").value = reqObj.reqURL;
	this.document.getElementById("originatingPage").value = reqObj.originatingPage;
	this.document.getElementById("regexp").value = reqObj.regexp;
	this.document.getElementById("dirSave").value = reqObj.dirSave;
	this.document.getElementById("readyState").value = reqObj.xmlhttp.readyState;
	try {
		this.document.getElementById("statusText").value = reqObj.xmlhttp.statusText;
	}
	catch(e) { }
	this.document.getElementById("responseText").value = reqObj.xmlhttp.responseText;
}

this.watch('reqObj', (a, b, c) => {setTimeout(rightOn, 0); return c});