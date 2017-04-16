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

/////////////////////////////    Used to get the links    /////////////////////////////
ihg_Functions.getLinks = function getLinks(sometext) {
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var re = ihg_Globals.downloadEmbeddedImages ? /<(?:a|img)\b.+?>/ig : /<a\b.+?>/ig;

	var filtered = sometext.replace(/\r?\n/g, " ");
	filtered = filtered.match(re);

	var theLinks = [];
	var caca = [];
	ihg_Functions.LOG("In " + myself + ", fixing to find the links.\n");

	re = ihg_Globals.downloadEmbeddedImages ? /\b(?:href|src)\s*=\s*('|")(.+?)\1/i : /\bhref\s*=\s*('|")(.+?)\1/i;

	if (filtered) {
		for (var j = 0; j < filtered.length; j++) {
			if (filtered[j]) {
				theLinks[j] = filtered[j].match(re);
				if (theLinks[j]) {
					var isEmbedded = (ihg_Globals.downloadEmbeddedImages && theLinks[j][0].match(/^src/i));

					var url = theLinks[j][2].replace(/&amp;/ig, '&');
					if (ihg_Globals.downloadEmbeddedImages && isEmbedded)
						url = "[embeddedImg]" + url;
					else
						url = ihg_Functions.removeAnonymizer(url);
					caca.push(url);
				}
			}
		}
	}
	ihg_Functions.LOG("In " + myself + ", caca is equal to: " + caca + "\n");	
	return caca;
}

////////////////////////////    Used to get an image source given the ID   /////////////////////////
ihg_Functions.getImgSrcById = function getImgSrcById(sometext, theID){
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var filtered = sometext.replace(/\r?\n/g, " ");
	filtered = filtered.match(/<img\b.+?>/ig);

	var theLinks = new Array();

	ihg_Functions.LOG("In " + myself + ", fixing to find the image.\n");
	if (filtered) {
		for (var j = 0; j < filtered.length; j++) {
			if (filtered[j]) {
				var idAttr = filtered[j].match(/\bid\s*=\s*("|')?(.+?)\1[\s>]/i);
				if (idAttr && idAttr[2] == theID) {
					theLinks[j] = filtered[j].match(/\bsrc\s*=\s*("|')?(.+?)\1[\s>]/i);
					if (theLinks[j]) {
						var caca = theLinks[j][2].replace(/&amp;/ig, '&');
						}
					}
				}
			}
		}

	if(!caca) ihg_Functions.LOG("In " + myself + ", sometext is equal to: " + sometext + "\n");
	ihg_Functions.LOG("In " + myself + ", caca is equal to: " + caca + "\n");
	return caca;
}

////////////////////////////    Used to get the frame tags    /////////////////////////
ihg_Functions.getFrameTags = function getFrameTags(sometext){
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var filtered = sometext.replace(/\r?\n/g, " ");
	filtered = filtered.match(/<frame\b.+?>/ig);

	ihg_Functions.LOG("In " + myself + ", filtered is equal to: " + filtered + "\n");
	return filtered;
}

////////////////////////////    Used to get the image tags    /////////////////////////
ihg_Functions.getImgTags = function getImgTags(sometext){
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var filtered = sometext.replace(/\r?\n/g, " ");
	filtered = filtered.match(/<img\b.+?>/ig);

	ihg_Functions.LOG("In " + myself + ", filtered is equal to: " + filtered + "\n");
	return filtered;
}

//////////////////   Gets the image source from an image tag /////////////////
ihg_Functions.getImgSrcFromTag = function getImgSrcFromTag(sometext){
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var filtered = sometext;

	ihg_Functions.LOG("In " + myself + ", fixing to find the image.\n");
	if (filtered) {
		var theSrc = filtered.match(/\bsrc\s*=\s*("|')?(.+?)\1[\s>]/i);
		ihg_Functions.LOG("In " + myself + ", theSrc is equal to: " + theSrc + "\n");	
		if (theSrc) {
			return theSrc[2].replace(/&amp;/ig, '&');
		}
	}

	ihg_Functions.LOG("In " + myself + ", no image 'src' found.\n");
	return null;
}

///////////////////////////  Get the data in a <p> node  ///////////////////////////////
ihg_Functions.getPNodeData = function getPNodeData(sometext){
	var myself = arguments.callee.name;
	ihg_Functions.LOG("Entering " + myself + "\n");

	var filtered = sometext.match(/<p>.+?<\/p>/igm);

	ihg_Functions.LOG("In " + myself + ", fixing to get the p nodes.\n");
	if(filtered) {
		for (var i=0; i < filtered.length; i++) {
			filtered[i] = filtered[i].replace("<p>", "");
			filtered[i] = filtered[i].replace("</p>", "");
			}
		}

	ihg_Functions.LOG("In " + myself + ", filtered is equal to: " + filtered + "\n");
	return filtered;
}