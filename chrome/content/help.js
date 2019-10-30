function buildContents() {
	for (var headingLvl = 3; headingLvl; headingLvl--) {
		var counter = 0;
		for (var heading of document.getElementById("Corpus").getElementsByTagName("h"+headingLvl)) {
			var parentNode = heading.parentNode;
			var containerLink = document.createElement("a");
			containerLink.setAttribute("name", "_Toc" + headingLvl + "_" + ++counter);
			parentNode.replaceChild(containerLink, heading);
			containerLink.appendChild(heading);
		}
	}

	for (var lnk of document.getElementById("Corpus").getElementsByTagName("a")) {
		if (lnk.name) {
			var ContentsElem = document.createElement("p");
			var ContentsLink = document.createElement("a");
			ContentsLink.href = "#" + lnk.name;
			ContentsLink.innerHTML = lnk.firstChild.textContent;
			ContentsElem.setAttribute("class", "MsoToc" + lnk.firstChild.tagName.match(/^h(\d+)$/i)[1]);
			ContentsElem.appendChild(ContentsLink);
			document.getElementById("Contents").appendChild(ContentsElem);
		}
	}
}