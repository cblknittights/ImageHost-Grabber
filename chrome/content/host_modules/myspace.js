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

ihg_Functions.escape_everything = function escape_everything(sometext) {
	var tmp_string = escape(sometext);
	tmp_string = tmp_string.replace(/\*/g, "%2A");
	tmp_string = tmp_string.replace(/@/g, "%40");
	//tmp_string = tmp_string.replace(/-/g, "%2D");
	tmp_string = tmp_string.replace(/_/g, "%5F");
	tmp_string = tmp_string.replace(/\+/g, "%2B");
	tmp_string = tmp_string.replace(/\./g, "%2E");
	tmp_string = tmp_string.replace(/\//g, "%2F");

	return tmp_string;
	}

ihg_Functions.get_cookies = function get_cookies() {
	var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
	var enumeratorThing = cookieManager.enumerator;

	var cookieTree = new Array();

	var count = 0;
	while(enumeratorThing.hasMoreElements()) {
		var newCookie = enumeratorThing.getNext().QueryInterface(Components.interfaces.nsICookie);
		if (newCookie.host.match(/^\.myspace/)) {
			cookieTree[count] = newCookie;
			count++;
			}
		}

	var CookieString = "";

	for (var i = 0; i < cookieTree.length; i++) {
		if (cookieTree[i].host.match(/^\.myspace/)) {
			CookieString += cookieTree[i].name + "=" + cookieTree[i].value + (i==cookieTree.length-1?"":"; ");
			}
		}
	return CookieString;
	}

ihg_Functions.getMyspacePage = function getMyspacePage(pageURL, newEventTarget, newEventArgument) {
	if (!newEventTarget) var newEventTarget = 'ctl00$Main$PagerTop';
	var ref_url = pageURL;


	var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
	var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
	var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);


	req = new XMLHttpRequest();
	req.open("GET", ref_url, false);
	req.send(null);


	CookieString = get_cookies();


	var theForm = req.responseText.match(/<form.+?id=("|')aspnetForm\1.*?>(?:.|[\f\n\r])+?<\/form>/)[0];
	var inputs = theForm.match(/<input.*>/g);

	var postData = "";

	for(var i = 0; i < inputs.length; i++) {
		var id = inputs[i].match(/id=("|')(.*?)\1/)[2];

		if(id.match(/EVENTTARGET/)) var value = newEventTarget;
		else if(id.match(/EVENTARGUMENT/)) var value = newEventArgument;
		else var value = inputs[i].match(/value=("|')(.*?)\1/)[2];

		if(id.match(/^ctl00/)) id = id.replace(/_/g, '%24');

		value = ihg_Functions.escape_everything(value);
		postData += id + "=" + value + (i==inputs.length-1?"":"&");
		}

	var ref_uri = ios.newURI(ref_url, null, null);
	ref_uri = ref_uri.QueryInterface(Components.interfaces.nsIURL);
	var cont_len = postData.length;
	var host = ref_uri.host;
	var file_and_args = ref_uri.path;

	var temp_thing = "POST " + file_and_args + " HTTP/1.1\r\n";
	temp_thing += "Accept-Encoding: gzip, deflate\r\n";
	temp_thing += "Host: " + host + "\r\n";
	temp_thing += "User-Agent: Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.6) Gecko/20070725 Firefox/2.0.0.6 XPCOMViewer/0.9.5\r\n";
	temp_thing += "Accept: text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5\r\n";
	temp_thing += "Accept-Language: en-us,en;q=0.5\r\n";
	temp_thing += "---------------: ------------\r\n";
	temp_thing += "Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7\r\n";
	//temp_thing += "Keep-Alive: 300\r\n";
	temp_thing += "Connection: close\r\n";
	temp_thing += "Referer: " + ref_url + "\r\n";
	temp_thing += "Cookie: " + CookieString + "\r\n";
	temp_thing += "Content-Type: application/x-www-form-urlencoded\r\n";
	temp_thing += "Content-Length: " + cont_len + "\r\n\r\n";
	temp_thing += postData + "\r\n";


	var transport = transportService.createTransport(null,0,host,80,null);
	var outstream = transport.openOutputStream(0,0,0);
	outstream.write(temp_thing,temp_thing.length);

	var instream = transport.openInputStream(0,0,0);
	sis.init(instream);

	var dataListener = {
		responseText : "",
		onStartRequest : function() {},
		onStopRequest : function() {
			instream.close();
			outstream.close();
			dump("We did it!\n");
			var tmpObj = {
				target : {
					channel : {	name : threadURL + "&page=" + newEventArgument },
					responseText : this.responseText
					}
				}
			getRDun(tmpObj);
			},
		onDataAvailable : function(request, context, inputStream, offset, count) {
			var poop = sis.read(count);
			this.responseText += poop;
			dump("count: " + count + "\n");
			dump("isPending: " + request.isPending() + "\n");
			}
		}

	pump.init(instream, -1, -1, 0, 0, false);
	pump.asyncRead(dataListener, null);
	}