var params = window.arguments[0];

function onLoad() {
	setFocus("patternValue");
}

function onUnLoad() {
}

function setFocus(id) {
	this.document.getElementById(id).focus();
}

function doOK() {
	var doc = this.document;
	var type = doc.getElementById("patternType").value;
	var val = doc.getElementById("patternValue").value;
	params.out = {type: type, value: val};
}