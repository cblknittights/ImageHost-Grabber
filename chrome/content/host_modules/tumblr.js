ihg_Functions.getTumblrPage = function getTumblrPage(pageURL, filterImages, time, targetLinks) {
	var d = time || Math.round(new Date().getTime() / 1000.0);
	var allLinks = targetLinks || [];

	var url = pageURL.match(/^.+\/archive/)[0] + "?before_time=" + d;

	var req = new XMLHttpRequest();
	req.open("GET", url, true);
	
	try {
		req.channel.QueryInterface(Components.interfaces.nsIHttpChannelInternal).forceAllowThirdPartyCookie = true;
	}
	catch(e) { /* Requires Gecko 1.9.2 */ }

	req.setRequestHeader("Referer", pageURL.match(/^.+\/archive/)[0]);
	req.setRequestHeader("X-Requested-With", "XMLHttpRequest");

	req.onload = function () {
		if (req.status !== 200) {
			alert("Error processing this tumblr page. Please try again.");
			return;
		}

		var pageData = req.responseText;
		var tempLinks = ihg_Functions.getLinks(pageData);

		for (var i = 0; i < tempLinks.length; i++) {
			// Possibly add some code here to handle other javascript type links
			var jsWrappedUrl = tempLinks[i].match(/javascript.+(\'|\")(https?.+?)\1/);
			if (jsWrappedUrl) tempLinks[i] = jsWrappedUrl[2];

			var isEmbedded = false;
			if (tempLinks[i].match(/^\[embeddedImg\]/)) {
				isEmbedded = true;
				tempLinks[i] = tempLinks[i].replace(/^\[embeddedImg\]/, "");
			}
				
			var someURI;
			try  {
				someURI = ihg_Globals.ioService.newURI(tempLinks[i], null, null);
			}
			catch (e) {
				someURI = ihg_Globals.ioService.newURI(req.channel.originalURI.spec, null, null);
				tempLinks[i] = someURI.resolve(tempLinks[i]);
			}
				
			if (isEmbedded) tempLinks[i] = "[embeddedImg]" + tempLinks[i];
			
			allLinks.push(tempLinks[i]);
		}

		var nextPage = pageData.match(/\?before_time=(\d+)/);
		if (nextPage) {
			ihg_Functions.getTumblrPage(req.channel.originalURI.spec, filterImages, nextPage[1], allLinks);
		}
		else {
			var docLinks = [];
			docLinks[ihg_Globals.firstPage] = allLinks;
			ihg_Functions.hostGrabber(docLinks, filterImages);
		}
	};
	req.onerror = function () {
		alert("Error processing this tumblr page. Please try again.");
	};

	req.send(null);
}